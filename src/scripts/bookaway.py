from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeoutError
import json
import time
import os
import re

def convert_usd_to_inr(price_str):
    """Convert price from USD to INR.
    Handles both single prices and price ranges.
    """
    try:
    
        if '-' in price_str:
            prices = price_str.split('-')
            converted_prices = []
            for p in prices:
                usd = float(p.strip())
                inr = round(usd * 87.83) 
                converted_prices.append(str(inr))
            return '-'.join(converted_prices)
        else:
            usd = float(price_str.strip())
            return str(round(usd * 87.83)) 
    except (ValueError, TypeError):
        return price_str 

def scrape_bookaway_popular_routes():
    all_routes_data = []  

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        
        try:
            main_page = context.new_page()
            main_page.goto("https://www.bookaway.com/", timeout=60000)
            
            try:
                main_page.wait_for_selector("section.popular-routes", timeout=10000)
                main_page.wait_for_selector("ul.popular-route-layout", state="visible", timeout=10000)
            except PlaywrightTimeoutError:
                print("⚠️ Popular routes section not found. The page might have changed structure.")
                main_page.screenshot(path="debug_screenshot.png")
                print("⚠️ Screenshot saved as 'debug_screenshot.png'")
                return

            route_links = main_page.query_selector_all("section.popular-routes ul.jsx-1808598477.hide-scroll.popular-route-layout a")
            print(f"Found {len(route_links)} popular routes...")

            for i, route in enumerate(route_links, 1):
                try:
                    href = route.get_attribute("href")
                    if not href:
                        print(f"[{i}/{len(route_links)}] No href found, skipping...")
                        continue
                    
                    route_url = f"https://www.bookaway.com{href}"
                    print(f"[{i}/{len(route_links)}] Processing: {route_url}")
                    
                    route_page = context.new_page()
                    
                    try:
                        max_retries = 3
                        for attempt in range(max_retries):
                            try:
                                route_page.goto(route_url, timeout=30000)
                                route_page.wait_for_selector('table[data-cy="route-info-table"]', timeout=15000)
                                break
                            except Exception as e:
                                if attempt == max_retries - 1:
                                    raise
                                print(f"  ⚠️  Attempt {attempt + 1} failed, retrying...")
                                time.sleep(2)
                        
                        title_el = route_page.query_selector(".jsx-908685816.header")
                        title_text = title_el.inner_text().strip() if title_el else "N/A"
                        print(f"  Scraping: {title_text}")
                        
                        from_city = to_city = "N/A"
                        if " to " in title_text.lower():
                            from_city, to_city = [x.strip() for x in re.split(r'\s+to\s+', title_text, flags=re.IGNORECASE)]
                            from_city = from_city.strip().capitalize()
                            to_city = to_city.split(' Trip Overview')[0].strip().capitalize()
                        
                        route_table = route_page.query_selector('table.jsx-2081236771.info-table[data-cy="route-info-table"]')
                        if not route_table:
                            print("  ⚠️ Route info table not found")
                            return []
                            
                        route_data = {
                            "Route URL": route_url,
                            "Title": f"{from_city} → {to_city}",
                            "From-To": f"{from_city} → {to_city}",
                            "From": from_city,
                            "To": to_city,
                            "Duration": "N/A",
                            "Price": "N/A",
                            "Transport Type": "Ferry",  
                            "Operator": "N/A",
                            "Departure Time": "N/A",
                            "Arrival Time": "N/A"
                        }
                        
                        rows = route_table.query_selector_all("tbody tr")
                        
                        for row in rows:
                            try:
                                name_el = row.query_selector(".jsx-2081236771.name")
                                value_el = row.query_selector(".jsx-2081236771.value")
                                
                                if not name_el or not value_el:
                                    continue
                                    
                                name = name_el.inner_text().strip()
                                value = value_el.inner_text().strip()
                                
                                if "Price" in name:
                                    price_nums = re.findall(r'\d+', value)
                                    if price_nums:
                                        if len(price_nums) > 1:
                                            price_str = f"{price_nums[0]}-{price_nums[1]}"
                                        else:
                                            price_str = price_nums[0]
                                        route_data["Price"] = convert_usd_to_inr(price_str)
                                elif "Duration" in name:
                                    route_data["Duration"] = value.replace("Ride Duration Range: ", "")
                                elif "Earliest Departure" in name:
                                    route_data["Departure Time"] = value
                                elif "Latest Departure" in name:
                                    route_data["Arrival Time"] = value
                                elif "Most Popular Operator" in name:
                                    operator_name = value
                                    operator_link = value_el.query_selector("a")
                                    if operator_link:
                                        name_el = operator_link.query_selector(".operator-name")
                                        if name_el:
                                            operator_name = name_el.inner_text().strip()
                                    route_data["Operator"] = operator_name
                                        
                            except Exception as e:
                                print(f"  ⚠️ Error processing table row: {str(e)[:100]}")
                                continue
                        
                        all_routes_data.append(route_data)
                        
                        print(f"  - Extracted data for {from_city} → {to_city}")
                        print(f"    Price: {route_data['Price']}")
                        print(f"    Duration: {route_data['Duration']}")
                        print(f"    Operator: {route_data['Operator']}")
                        print(f"    Departure: {route_data['Departure Time']}")
                        print(f"    Arrival: {route_data['Arrival Time']}")
                                
                        print(f"  ✅ Successfully added route data to the collection")
                            
                    except Exception as e:
                        print(f"   Error processing route: {str(e)[:100]}...")
                        
                        print(f"   Successfully scraped {len(route_data_list)} routes from {from_city} to {to_city}")
                        print(f"  Total routes collected so far: {len(all_routes_data)}")
                        
                    except Exception as e:
                        print(f"   Error processing route: {str(e)[:100]}...")
                    
                    finally:
                        route_page.close()
                        time.sleep(1)
                
                except Exception as e:
                    print(f" Unexpected error on route {i}: {str(e)[:100]}...")
                    continue
            
            # Save results
            if all_routes_data:
                output_file = "bookaway_routes.json"
                with open(output_file, "w", encoding="utf-8") as f:
                    json.dump(all_routes_data, f, ensure_ascii=False, indent=2)
                print(f"\n Successfully saved {len(all_routes_data)} routes to '{output_file}'")
                print(f"File saved to: {os.path.abspath(output_file)}")
            else:
                print("\n  No data was scraped. Check the logs for errors.")
                
        except Exception as e:
            print(f"\n Fatal error: {str(e)}")
            
        finally:
        
            if 'context' in locals():
                context.close()
            if 'browser' in locals():
                browser.close()

if __name__ == "__main__":
    scrape_bookaway_popular_routes()
