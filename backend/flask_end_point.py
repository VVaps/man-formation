# flask_end_point.py

import os
import time
import re
import requests
from bs4 import BeautifulSoup
import undetected_chromedriver as uc
from selenium.webdriver.chrome.options import Options
from datetime import datetime
import argparse
import subprocess
from sqlalchemy import create_engine, Column, Integer, String, Text, TIMESTAMP, JSON
from sqlalchemy.orm import declarative_base, sessionmaker
import time

# ADDED: For JWT decoding
import jwt
from jwt import ExpiredSignatureError, InvalidTokenError
from functools import wraps

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS

import logging
import json_log_formatter

formatter = json_log_formatter.JSONFormatter()

json_handler = logging.StreamHandler()
json_handler.setFormatter(formatter)

logger = logging.getLogger('myapp')
logger.addHandler(json_handler)
logger.setLevel(logging.INFO)

# Now when you log:
logger.info("Hello, World!")


# ---------------------------
# Helper Functions for Crawling & Processing
# ---------------------------
def remove_cookies_elements(driver):
    js_code = """
    var selectors = [
      '[class*="cookie"]',
      '[id*="cookie"]',
      '[class*="consent"]',
      '[id*="consent"]',
      '[class*="cc-modal"]',
      '[id*="cc-modal"]',
      '[class*="privacy"]',
      '[id*="privacy"]'
    ];
    selectors.forEach(function(selector) {
      document.querySelectorAll(selector).forEach(function(el) {
        el.remove();
      });
    });
    """
    driver.execute_script(js_code)
    print("Cookie-related elements removed.")

def crawl_target_page_with_selenium(url, output_dir):
    from selenium.webdriver.common.by import By
    from selenium.webdriver.support.ui import WebDriverWait
    from selenium.webdriver.support import expected_conditions as EC
    import undetected_chromedriver as uc
    import time, os

    chrome_options = uc.ChromeOptions()
    chrome_options.binary_location = "/usr/bin/chromium"
    chrome_options.add_argument("--headless")
    chrome_options.add_argument("--window-size=1920,1080")
    chrome_options.add_argument("--incognito")  # Use incognito mode; cookies stay in memory only

    driver = uc.Chrome(version_main=134 ,options=chrome_options)

    driver.get(url)
    time.sleep(5)  # Allow time for the page to load and tokens to refresh

    # Optionally, dismiss the cookie banner
    try:
        button = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((By.XPATH, "//*[contains(text(), 'Refuser')]"))
        )
        button.click()
        print("Cookie banner dismissed by clicking the 'Refuser' button.")
    except Exception as e:
        print("Could not click cookie banner button:", e)

    # Wait again to ensure the page is fully loaded
    time.sleep(5)
    
    # At this point, the page has loaded with a valid session.
    # Optionally, clear cookies now if you don't need them further:
    driver.delete_all_cookies()

    raw_html = driver.page_source
    raw_html_path = os.path.join(output_dir, "raw.html")
    with open(raw_html_path, "w", encoding="utf-8") as f:
        f.write(raw_html)
    driver.quit()
    print("Crawling complete. Raw HTML saved at:", raw_html_path)
    return raw_html_path




def remove_cookie_elements(driver):
    from selenium.webdriver.common.by import By
    from selenium.webdriver.support.ui import WebDriverWait
    from selenium.webdriver.support import expected_conditions as EC
    try:
        # Wait and then click the "Refuser" button if found
        refuse_button = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((By.XPATH, "//*[contains(text(), 'Refuser')]"))
        )
        refuse_button.click()
        print("Cookie banner dismissed by clicking the refuse button.")
    except Exception as e:
        print("Could not dismiss cookie banner by clicking:", e)
        # Fallback: try removing the banner via JS
        try:
            driver.execute_script("""
                let banner = document.querySelector('div._4-i2._pig._al5h._al7j._50f4');
                if (banner) {
                    banner.remove();
                }
            """)
            print("Cookie banner removed via JavaScript.")
        except Exception as js_e:
            print("JavaScript removal of cookie banner failed:", js_e)



def sanitize_html(raw_html_path, base_url, output_dir, sanitized_path=None):
    if not sanitized_path:
        sanitized_path = os.path.join(output_dir, "sanitized.html")
    safe_placeholder = "https://safe-placeholder.com"
    with open(raw_html_path, "r", encoding="utf-8") as f:
        html = f.read()
    soup = BeautifulSoup(html, "html.parser")
    
    # Remove all <script> tags
    for script in soup.find_all("script"):
        script.decompose()
    
    # Set all form actions to "#"
    for form in soup.find_all("form"):
        form["action"] = "#"
    
    # Adjust <link> tags (for CSS)
    for tag in soup.find_all("link", href=True):
        if tag.get("rel") and "stylesheet" in tag.get("rel"):
            href = tag.get("href")
            css_filename = os.path.basename(href.split("?")[0])
            local_css_path = os.path.join("css", css_filename)
            if os.path.exists(os.path.join(output_dir, "css", css_filename)):
                tag["href"] = local_css_path
            else:
                tag["href"] = requests.compat.urljoin(base_url, href)
    
    # Adjust <img> tags
    for img in soup.find_all("img"):
        src = img.get("src")
        if not src or src.startswith("data:"):
            img["src"] = safe_placeholder
        else:
            img["src"] = requests.compat.urljoin(base_url, src)
        if img.has_attr("data-src"):
            data_src = img.get("data-src")
            if data_src and not data_src.startswith("data:"):
                img["data-src"] = requests.compat.urljoin(base_url, data_src)
            else:
                img["data-src"] = safe_placeholder
    
    # Adjust <source> tags
    for source in soup.find_all("source"):
        srcset = source.get("srcset")
        if srcset:
            source["srcset"] = requests.compat.urljoin(base_url, srcset)
        if source.has_attr("data-srcset"):
            data_srcset = source.get("data-srcset")
            if data_srcset and not data_srcset.startswith("data:"):
                source["data-srcset"] = requests.compat.urljoin(base_url, data_srcset)
            else:
                source["data-srcset"] = safe_placeholder
    
    with open(sanitized_path, "w", encoding="utf-8") as f:
        f.write(soup.prettify())
    print("HTML sanitization complete. Sanitized HTML saved at:", sanitized_path)
    return sanitized_path

def regenerate_safe_version_local(sanitized_html_path, output_dir, safe_html_path=None):
    if not safe_html_path:
        safe_html_path = os.path.join(output_dir, "safe_version.html")
    with open(sanitized_html_path, "r", encoding="utf-8") as f:
        html = f.read()
    soup = BeautifulSoup(html, "html.parser")
    
    # Insert disclaimer at the top
    disclaimer = soup.new_tag("div", style="background-color:#fdd; padding:10px; border:1px solid #f99;")
    disclaimer.string = "Avertissement pédagogique : il s’agit d’une version sécurisée et non fonctionnelle du site, créée à des fins éducatives."
    if soup.body:
        soup.body.insert(0, disclaimer)
    else:
        soup.insert(0, disclaimer)
    
    # Ensure form actions remain "#"
    for form in soup.find_all("form"):
        form["action"] = "#"
    
    with open(safe_html_path, "w", encoding="utf-8") as f:
        f.write(soup.prettify())
    print("Safe version regenerated. Output saved at:", safe_html_path)
    return safe_html_path


def inject_tracking_script_with_token(html_file_path, tracking_script, raw_token):
    """
    1. Reads the safe HTML file.
    2. Inserts <script>window.USER_TOKEN = "...";</script> near the top (or inside <head>).
    3. Injects the main tracking script at the end (like inject_tracking_script does).
    """

    # 1) Read the existing safe HTML
    try:
        with open(html_file_path, 'r', encoding='utf-8') as f:
            html_content = f.read()
    except Exception as e:
        print(f"Error reading {html_file_path}: {e}")
        return

    # 2) Insert a <script> block that sets window.USER_TOKEN
    token_script = f"""
<script>
  window.USER_TOKEN = "{raw_token}";
</script>
"""

    # Let’s place this script right before </head> if it exists; otherwise, at top of the file
    if "</head>" in html_content:
        html_content = html_content.replace("</head>", token_script + "\n</head>")
    else:
        # fallback if there's no head
        html_content = token_script + "\n" + html_content

    # 3) Then also inject the main tracking script
    #    which references 'window.USER_TOKEN'
    #    This is basically what inject_tracking_script does:
    if "</body>" in html_content:
        new_html = html_content.replace("</body>", tracking_script + "\n</body>")
    else:
        new_html = html_content + "\n" + tracking_script

    # 4) Write the updated HTML
    try:
        with open(html_file_path, 'w', encoding='utf-8') as f:
            f.write(new_html)
        print("Injected token & tracking script into:", html_file_path)
    except Exception as e:
        print(f"Error writing {html_file_path}: {e}")


def inject_tracking_script(html_file_path, tracking_script):
    try:
        with open(html_file_path, "r", encoding="utf-8") as file:
            html_content = file.read()
    except Exception as e:
        print(f"Error reading {html_file_path}: {e}")
        return
    if "</body>" in html_content:
        new_html = html_content.replace("</body>", tracking_script + "\n</body>")
    else:
        new_html = html_content + "\n" + tracking_script
    try:
        with open(html_file_path, "w", encoding="utf-8") as file:
            file.write(new_html)
        print("Tracking script injected into:", html_file_path)
    except Exception as e:
        print(f"Error writing {html_file_path}: {e}")

# Tracking script (update URL for local testing)
tracking_script = """
<script>
  // Identify the current page using its URL
  const pageIdentifier = window.location.href;

  // Function to send event data to the backend
  function sendEventData(data) {
    console.log("Sending event:", data);
    fetch('http://127.0.0.1:5001/track', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': window.USER_TOKEN ? `Bearer ${window.USER_TOKEN}` : ''
      },
      body: JSON.stringify(data)
    }).catch(error => console.error('Error sending event data:', error));
  }

  // Existing tracking for form submissions (now including page identifier)
  document.addEventListener('DOMContentLoaded', function() {
    document.querySelectorAll('form').forEach(function(form) {
      form.addEventListener('submit', function(event) {
        event.preventDefault();
        const formData = new FormData(form);
        const formDataObj = {};
        formData.forEach((value, key) => { formDataObj[key] = value; });
        sendEventData({
          eventType: 'formSubmit',
          page: pageIdentifier,
          action: form.action,
          formData: formDataObj,
          timestamp: Date.now()
        });
      });
    });
  });
</script>
"""



# ---------------------------
# Pipeline Function to Run the Crawl & Process
# ---------------------------
def run_pipeline(target_url, raw_token):
    """
    Runs the full pipeline: 
      1) Crawls the site with Selenium,
      2) Sanitizes the raw HTML,
      3) Regenerates a "safe" version,
      4) Injects both the tracking script and the user's JWT token into that HTML,
      5) Returns the path to the safe HTML file and the output directory.
    """

    # Example folder structure for each pipeline run
    run_folder = "run_" + datetime.now().strftime("%Y%m%d_%H%M%S")
    os.makedirs(run_folder, exist_ok=True)
    output_dir = os.path.join(run_folder, "output")
    assets_dir = os.path.join(output_dir, "assets")
    css_dir = os.path.join(output_dir, "css")
    js_dir = os.path.join(output_dir, "js")
    fonts_dir = os.path.join(output_dir, "fonts")

    for folder in [output_dir, assets_dir, css_dir, js_dir, fonts_dir]:
        os.makedirs(folder, exist_ok=True)

    raw_html_path = crawl_target_page_with_selenium(target_url, output_dir)
    sanitized_html_path = sanitize_html(raw_html_path, target_url, output_dir)
    safe_html_path = regenerate_safe_version_local(sanitized_html_path, output_dir)
    inject_tracking_script_with_token(safe_html_path, tracking_script, raw_token)

    print("Safe version processing complete. Output folder:", output_dir)
    return safe_html_path, output_dir


# ---------------------------
# SQLAlchemy Database Setup
# ---------------------------
import time
from sqlalchemy.exc import OperationalError

# Update these credentials with your local MySQL settings

db_user = os.environ.get('DB_USER', 'root')
db_password = os.environ.get('DB_PASSWORD', 'password')
db_host = os.environ.get('DB_HOST', 'mysql_db')
db_name = os.environ.get('DB_NAME', 'tracking_db')

engine = create_engine(
    f"mysql+pymysql://{db_user}:{db_password}@{db_host}/{db_name}"
)

for attempt in range(10):
    try:
        engine.connect()
        print("✅ MySQL clearly ready!")
        break
    except OperationalError:
        print(f"🔄 Waiting clearly for MySQL to start... ({attempt + 1}/10)")
        time.sleep(5)
else:
    raise Exception("❌ Clearly could not connect to MySQL after multiple attempts.")


SessionLocal = sessionmaker(bind=engine)
Base = declarative_base()

class UserEvent(Base):
    __tablename__ = 'user_events'
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=True)  # Add user_id column
    event_type = Column(String(50), nullable=False)
    ip_address = Column(String(50))
    user_agent = Column(Text)
    timestamp = Column(TIMESTAMP, default=datetime.utcnow)
    additional_data = Column(JSON)

Base.metadata.create_all(bind=engine)

# ---------------------------
# Flask App Setup & Endpoints
# ---------------------------
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS

app = Flask(__name__)
CORS(app, 
     resources={r"*": {"origins": "*"}},
     allow_headers=["Content-Type", "Authorization"],
     methods=["GET", "POST", "OPTIONS", "DELETE", "PUT"],
     supports_credentials=True)

# ADDED: Set your secret key (MUST match what you used to sign tokens)
app.config['SECRET_KEY'] = 'KJhasjkdh!21287312hJHASk'
app.config['REFRESH_SECRET_KEY'] = 'JHJahsdqwe7123!98JHkjas'

# Global variable to store the safe HTML path (used by the "/" route)
safe_html_path_global = None


# ============================
# ADDED: require_token DECORATOR
# ============================
def require_token(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        # If it's an OPTIONS request, just return 200 OK
        if request.method == "OPTIONS":
            return "", 200

        # Otherwise, proceed with normal token check
        auth_header = request.headers.get("Authorization")
        if not auth_header:
            return jsonify({"error": "Missing Authorization header"}), 401
        
        parts = auth_header.split()
        if len(parts) != 2 or parts[0].lower() != 'bearer':
            return jsonify({"error": "Invalid auth header format"}), 401
        
        token = parts[1]
        try:
            decoded = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
            request.user_id = decoded.get('id') or decoded.get('user_id') or decoded.get('sub')
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Token expired"}), 401
        except jwt.InvalidTokenError:
            return jsonify({"error": "Invalid token"}), 401

        return f(*args, **kwargs)
    return decorated


@app.route('/track', methods=['POST'])
@require_token
def track_event():
    data = request.get_json()
    if not data or 'eventType' not in data:
        return jsonify({"error": "Invalid data"}), 400

    event = UserEvent(
        event_type=data.get('eventType'),
        user_id=request.user_id,
        ip_address=request.remote_addr,
        user_agent=request.headers.get('User-Agent'),
        additional_data=data
    )

    db = SessionLocal()
    try:
        db.add(event)
        db.commit()
        db.refresh(event)
    except Exception as e:
        db.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        db.close()
    return jsonify({"status": "success", "id": event.id}), 200

@app.route('/api/start-crawl', methods=['POST'])
@require_token
def start_crawl_endpoint():
    data = request.get_json()
    if not data or 'target_url' not in data:
        return jsonify({'error': 'target_url is required'}), 400

    # The user is authenticated, so let's retrieve the raw token from the header
    auth_header = request.headers.get('Authorization')
    parts = auth_header.split()
    raw_token = parts[1]  # The second part is the actual JWT

    target_url = data['target_url']
    try:
        # Now we pass the token as the second argument
        safe_html_path, output_dir = run_pipeline(target_url, raw_token)

        global safe_html_path_global
        safe_html_path_global = safe_html_path

        safe_site_url = "http://127.0.0.1:5001/"
        return jsonify({
            'status': 'Crawl and processing complete',
            'site_url': safe_site_url
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/')
def serve_safe_site():
    if safe_html_path_global:
        directory = os.path.dirname(safe_html_path_global)
        filename = os.path.basename(safe_html_path_global)
        return send_from_directory(directory, filename)
    else:
        return "Safe HTML file not specified.", 404

@app.route('/api/events', methods=['GET', 'OPTIONS'])
@require_token
def get_user_events():
    if request.method == 'OPTIONS':
        return '', 200

    db = SessionLocal()
    try:
        user_id = request.user_id
        events = db.query(UserEvent).filter_by(user_id=user_id).all()
        results = []
        for e in events:
            results.append({
                "id": e.id,
                "user_id": e.user_id,
                "event_type": e.event_type,
                "ip_address": e.ip_address,
                "user_agent": e.user_agent,
                "timestamp": e.timestamp,
                "additional_data": e.additional_data
            })
        return jsonify(results), 200
    except Exception as err:
        db.rollback()
        return jsonify({"error": str(err)}), 500
    finally:
        db.close()
@app.route('/api/events/all', methods=['DELETE', 'OPTIONS'])
@require_token
def delete_all_events():
    if request.method == 'OPTIONS':
        response = app.make_response("")
        response.status_code = 200
        response.headers.add("Access-Control-Allow-Origin", "*")
        response.headers.add("Access-Control-Allow-Headers", "Content-Type, Authorization")
        response.headers.add("Access-Control-Allow-Methods", "GET, POST, OPTIONS, DELETE, PUT")
        return response

    db = SessionLocal()
    try:
        user_id = request.user_id
        events = db.query(UserEvent).filter_by(user_id=user_id).all()
        if not events:
            return jsonify({"error": "No events found for user"}), 404
        for event in events:
            db.delete(event)
        db.commit()
        return jsonify({"status": "success", "message": "All events deleted"}), 200
    except Exception as e:
        db.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        db.close()



@app.route('/api/events/summary', methods=['GET', 'OPTIONS'])
@require_token
def get_events_summary():
    if request.method == 'OPTIONS':
        return '', 200
    db = SessionLocal()
    try:
        user_id = request.user_id
        events = db.query(UserEvent).filter_by(user_id=user_id).all()
        summary = {}
        for event in events:
            summary[event.event_type] = summary.get(event.event_type, 0) + 1
        return jsonify(summary), 200
    except Exception as e:
        db.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        db.close()

""" @app.route('/api/aggregated-metrics', methods=['GET', 'OPTIONS'])
@require_token
def get_aggregated_metrics():
    if request.method == 'OPTIONS':
        return '', 200
    db = SessionLocal()
    try:
        user_id = request.user_id
        # Query all aggregatedMetrics events for this user
        events = db.query(UserEvent).filter_by(user_id=user_id, event_type='aggregatedMetrics').all()
        total_clicks = sum(event.additional_data.get('clickCount', 0) for event in events if event.additional_data)
        total_inputs = sum(event.additional_data.get('inputCount', 0) for event in events if event.additional_data)
        return jsonify({
            'totalClicks': total_clicks,
            'totalInputs': total_inputs,
            'eventsCount': len(events)
        }), 200
    except Exception as e:
        db.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        db.close()
 """

@app.route('/api/events/<int:event_id>', methods=['GET', 'OPTIONS'])
@require_token
def get_event_by_id(event_id):
    # Handle preflight OPTIONS request explicitly
    if request.method == 'OPTIONS':
        response = app.make_response("")
        response.status_code = 200
        response.headers.add("Access-Control-Allow-Origin", "*")
        response.headers.add("Access-Control-Allow-Headers", "Content-Type, Authorization")
        response.headers.add("Access-Control-Allow-Methods", "GET, POST, OPTIONS, DELETE, PUT")
        return response

    db = SessionLocal()
    try:
        user_id = request.user_id
        # Query the event by ID and ensure it belongs to the authenticated user
        event = db.query(UserEvent).filter_by(id=event_id, user_id=user_id).first()
        if not event:
            return jsonify({"error": "Event not found or access denied"}), 404

        event_data = {
            "id": event.id,
            "user_id": event.user_id,
            "event_type": event.event_type,
            "ip_address": event.ip_address,
            "user_agent": event.user_agent,
            "timestamp": event.timestamp,
            "additional_data": event.additional_data
        }
        return jsonify(event_data), 200
    except Exception as err:
        db.rollback()
        return jsonify({"error": str(err)}), 500
    finally:
        db.close()

@app.route('/api/events/<int:event_id>', methods=['DELETE', 'OPTIONS'])
@require_token
def delete_event(event_id):
    if request.method == 'OPTIONS':
        response = app.make_response("")
        response.status_code = 200
        response.headers.add("Access-Control-Allow-Origin", "*")
        response.headers.add("Access-Control-Allow-Headers", "Content-Type, Authorization")
        response.headers.add("Access-Control-Allow-Methods", "GET, POST, OPTIONS, DELETE, PUT")
        return response

    db = SessionLocal()
    try:
        user_id = request.user_id
        event = db.query(UserEvent).filter_by(id=event_id, user_id=user_id).first()
        if not event:
            return jsonify({"error": "Event not found or access denied"}), 404

        db.delete(event)
        db.commit()
        return jsonify({"status": "success", "message": f"Event {event_id} deleted"}), 200
    except Exception as e:
        db.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        db.close()



# ---------------------------
# Main Entry Point
# ---------------------------
if __name__ == '__main__':
    # For local testing, run the Flask app on port 5001.
    app.run(debug=True, host='0.0.0.0', port=5001)
