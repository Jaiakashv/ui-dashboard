from playwright.sync_api import sync_playwright
import json
import time
import re
from urllib.parse import urljoin, urlparse, unquote

HEADLESS = False
MAX_ROUTES = None          # set to an int to limit number of route pages to visit
MAX_TRIPS_PER_ROUTE = 10   # how many trips to scrape per route
OUTPUT_FILE = "redbus_routes.json"

def safe_text(el):
    try:
        t = el.text_content()
        return t.strip() if t else ""
    except:
        return ""

def clean_price(txt):
    if not txt:
        return ""
    return re.sub(r'[^\d.]', '', txt)

def parse_title_from_route_url(route_url):
    try:
        p = urlparse(route_url)
        path = unquote(p.path)  # decode any %-encoded parts
        # path like /bus-tickets/delhi-to-manali or /bus-tickets/delhi-to-manali
        parts = [seg for seg in path.split("/") if seg]
        # find the segment that contains '-to-'
        seg = None
        for s in parts[::-1]:
            if "-to-" in s.lower():
                seg = s
                break
        if not seg:
            # fallback: last segment
            seg = parts[-1] if parts else ""
        # replace - with space and split around ' to '
        seg_clean = seg.replace("-to-", " to ").replace("-", " ")
        # create Title with arrow and From/To
        # attempt to split by ' to '
        if " to " in seg_clean.lower():
            left, right = re.split(r'\s+to\s+', seg_clean, maxsplit=1, flags=re.IGNORECASE)
            from_v = left.strip().title()
            to_v = right.strip().title()
            title = f"{from_v} → {to_v}"
            return title, from_v, to_v
        # else fallback
        title = seg_clean.replace("+", " ").title()
        return title, "", ""
    except:
        return "", "", ""

def scrape_redbus(home_url="https://www.redbus.in/", max_routes=None, max_trips_per_route=10, headless=False):
    results = []
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=headless, args=['--lang=en-US,en;q=0.9'])
        context = browser.new_context(locale='en-IN', viewport={'width': 1280, 'height': 800})
        page = context.new_page()
        page.set_extra_http_headers({'Accept-Language': 'en-IN,en;q=0.9'})
        try:
            page.goto(home_url, timeout=60000, wait_until='domcontentloaded')
            # give the page a moment to render the listWrap (if dynamic)
            page.wait_for_timeout(1500)
        except Exception as e:
            print("Failed to open RedBus home:", e)
            try: page.close()
            except: pass
            try: browser.close()
            except: pass
            return results

        # Find route anchors inside the listWrap, fallback to any .accordionLinks
        anchors = page.query_selector_all("div.listWrap a.accordionLinks, a.accordionLinks")
        if not anchors:
            print("No route anchors found on home page.")
            try: page.close()
            except: pass
            try: browser.close()
            except: pass
            return results

        if max_routes:
            anchors = anchors[:max_routes]

        for ai, a in enumerate(anchors, start=1):
            try:
                href = a.get_attribute("href") or ""
                if not href:
                    continue
                route_url = href if href.startswith("http") else urljoin(home_url, href)
                title_text, from_v, to_v = parse_title_from_route_url(route_url)

                # Open route search results page
                route_page = context.new_page()
                try:
                    route_page.goto(route_url, timeout=60000, wait_until='domcontentloaded')
                    route_page.wait_for_timeout(2000)  # allow scripts to render the list
                except Exception as e:
                    try: route_page.close()
                    except: pass
                    continue

                # Trip list selectors (items in search results)
                trip_item_selector = "ul.srpList__ind-search-styles-module-scss-EOdde li.tupleWrapper___aa6a16, li.tupleWrapper___aa6a16"
                trip_items = route_page.query_selector_all(trip_item_selector)
                if not trip_items:
                    # fallback to generic list items on page
                    trip_items = route_page.query_selector_all("li")

                # limit trips
                if max_trips_per_route:
                    trip_items = trip_items[:max_trips_per_route]

                for ti, item in enumerate(trip_items, start=1):
                    try:
                        dep = safe_text(item.query_selector("p.boardingTime___aced27"))
                        arr = safe_text(item.query_selector("p.droppingTime___616c2f"))
                        dur = safe_text(item.query_selector("p.duration___5b44b1"))
                        operator = safe_text(item.query_selector("div.travelsName___495898"))
                        price_raw_el = item.query_selector("p.finalFare___898bb7, p.finalFare___898bb7, p.finalFare___898bb7")
                        price_txt = safe_text(price_raw_el) if price_raw_el else ""
                        price = clean_price(price_txt)
                        # build object
                        entry = {
                            "Route URL": route_url,
                            "Title": title_text,
                            "From-To": title_text,
                            "From": from_v,
                            "To": to_v,
                            "Duration": dur,
                            "Price": price,
                            "Transport Type": "Bus",
                            "Operator": operator,
                            "Departure Time": dep,
                            "Arrival Time": arr
                        }
                        results.append(entry)
                    except Exception:
                        continue

                try:
                    route_page.close()
                except:
                    pass

                # polite pause
                time.sleep(0.8)

            except Exception:
                continue

        try:
            page.close()
            browser.close()
        except:
            pass

    return results

if __name__ == "__main__":
    data = scrape_redbus(max_routes=20 if MAX_ROUTES is None else MAX_ROUTES,
                         max_trips_per_route=MAX_TRIPS_PER_ROUTE,
                         headless=HEADLESS)
    print(json.dumps(data[:10], indent=2, ensure_ascii=False))
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"Saved {len(data)} items to {OUTPUT_FILE}")
