from playwright.sync_api import sync_playwright
import json, time, re
from datetime import datetime, timedelta
import requests

def safe_text(el):
    try:
        t = el.text_content()
        return t.strip() if t else ""
    except:
        return ""

def clean_price_text(txt):
    if not txt:
        return "0"
    s = re.sub(r'[^\d.]', '', txt)
    return s or "0"

def parse_time_hm(tstr):
    if not tstr:
        return None
    m = re.match(r'(\d{1,2}):(\d{2})', tstr.strip())
    return (int(m.group(1)), int(m.group(2))) if m else None

def compute_duration(dep, arr):
    dep_t, arr_t = parse_time_hm(dep), parse_time_hm(arr)
    if not dep_t or not arr_t:
        return ""
    base = datetime(2000,1,1, dep_t[0], dep_t[1])
    other = datetime(2000,1,1, arr_t[0], arr_t[1])
    if other < base:
        other += timedelta(days=1)
    d = other - base
    mins = int(d.total_seconds() // 60)
    h, m = mins // 60, mins % 60
    if h == 0:
        return f"{m}m"
    if m == 0:
        return f"{h}h"
    return f"{h}h {m}m"

def convert_thb_to_inr(thb_amount):
    try:
        fixed = 2.3
        resp = requests.get(
            "https://api.exchangerate.host/convert",
            params={'from':'THB','to':'INR','amount':thb_amount,'places':2},
            timeout=5
        )
        if resp.status_code == 200:
            j = resp.json()
            if j.get('success') and 'result' in j:
                return round(float(j['result']), 2)
    except:
        pass
    try:
        return round(float(thb_amount) * fixed, 2)
    except:
        return 0.0

def scrape_busx(max_trips=10, headless=False, max_routes=None):
    out = []
    with sync_playwright() as p:
        b = p.chromium.launch(headless=headless, args=['--lang=en-US,en;q=0.9'])
        ctx = b.new_context(locale='en-US', viewport={'width':1366,'height':768})
        page = ctx.new_page()
        page.set_extra_http_headers({'Accept-Language':'en-US,en;q=0.9'})
        try:
            page.goto("https://www.busx.com/en-us", timeout=60000, wait_until='networkidle')
            page.wait_for_selector("div.row", timeout=15000)
        except Exception as e:
            try: page.close()
            except: pass
            try: b.close()
            except: pass
            return out

        cards = page.query_selector_all("div.row div.card.card-popular-route")
        if max_routes:
            cards = cards[:max_routes]

        for idx, card in enumerate(cards, start=1):
            route_page = None
            try:
                title = safe_text(card.query_selector("h5.card-title"))
                if not title:
                    continue
                from_to = title.replace(" - ", " → ")
                if " - " in title:
                    from_v, to_v = [s.strip() for s in title.split(" - ", 1)]
                else:
                    from_v, to_v = "", ""
                route_url = card.evaluate("n => (n.closest ? n.closest('a') : (n.parentElement && n.parentElement.tagName === 'A' ? n.parentElement : null))?.href")
                if not route_url:
                    parent = card.query_selector("xpath=..")
                    if parent:
                        route_url = parent.get_attribute("href") or route_url
                if not route_url:
                    continue

                route_page = ctx.new_page()
                try:
                    route_page.goto(route_url, timeout=60000, wait_until='domcontentloaded')
                    route_page.wait_for_timeout(2500)
                except:
                    try: route_page.close()
                    except: pass
                    continue

                trip_selectors = [
                    "div.list-group-item.disable-choose-depart",
                    "div.list-group-item-show",
                    "div.list-group-item",
                    "div.list-info",
                    "div.card-body.block-select"
                ]

                trip_containers = []
                for sel in trip_selectors:
                    trip_containers = route_page.query_selector_all(sel)
                    if trip_containers:
                        filtered = []
                        for c in trip_containers:
                            if c.query_selector(".show_name_carrier") or c.query_selector(".show_chooes_price") or c.query_selector(".select-choose-depart"):
                                filtered.append(c)
                        trip_containers = filtered if filtered else trip_containers
                        break

                if not trip_containers:
                    trip_containers = route_page.query_selector_all("div.card.border-0, div.list-info")
                    if not trip_containers:
                        try:
                            route_page.screenshot(path=f"busx_no_trips_{idx}.png")
                        except:
                            pass
                        try: route_page.close()
                        except: pass
                        continue

                for trip in trip_containers[:max_trips]:
                    try:
                        operator = safe_text(trip.query_selector(".mb-0.show_name_carrier"))
                        departure_time = safe_text(trip.query_selector(".pr-1.show-time.color-second.show_paypoint_boarding_time, .show_paypoint_boarding_time"))
                        arrival_time = safe_text(trip.query_selector(".pr-1.show-time.color-second.show_paypoint_arrival_time, .show_paypoint_arrival_time"))
                        price_el = trip.query_selector(".show_chooes_price, .choose_price, .show_total_price, .show_adult_price")

                        thb_txt = safe_text(price_el) if price_el else ""
                        if not thb_txt and price_el:
                            thb_txt = price_el.get_attribute("data-show-chooes-base-price") or price_el.get_attribute("data-price") or ""
                        thb_clean = clean_price_text(thb_txt)
                        try:
                            thb_val = float(thb_clean)
                        except:
                            thb_val = 0.0
                        inr_val = convert_thb_to_inr(thb_val)

                        duration = compute_duration(departure_time, arrival_time)

                        item = {
                            "Route URL": route_url,
                            "Title": from_to,
                            "From-To": from_to,
                            "From": from_v,
                            "To": to_v,
                            "Duration": duration,
                            "Price": f"{inr_val:.2f}",
                            "Transport Type": "Bus",
                            "Operator": operator,
                            "Departure Time": departure_time,
                            "Arrival Time": arrival_time
                        }
                        out.append(item)
                    except:
                        continue

                try: route_page.close()
                except: pass
                time.sleep(1.0)

            except:
                try:
                    if route_page:
                        route_page.close()
                except:
                    pass
                continue

        try:
            page.close()
            b.close()
        except:
            pass

    return out

if __name__ == "__main__":
    data = scrape_busx(max_trips=10, headless=False)
    print(json.dumps(data, indent=2, ensure_ascii=False))
    with open("busx_routes.json", "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
