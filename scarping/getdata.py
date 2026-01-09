import requests
from bs4 import BeautifulSoup
import os
from datetime import datetime

def scrape_edzeb(url, filename=None):
    """Scrape content from edZeb website and save to file"""
    
    # Make the request
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
    
    try:
        response = requests.get(url, headers=headers)
        response.raise_for_status()
    except requests.exceptions.RequestException as e:
        print(f"Error fetching {url}: {e}")
        return None
    
    # Parse the HTML
    soup = BeautifulSoup(response.text, 'html.parser')
    
    # Remove unnecessary elements
    for element in soup(["script", "style", "nav", "header", "footer", "aside"]):
        element.decompose()
    
    # Get clean text content
    clean_text = soup.get_text(separator='\n', strip=True)
    
    # Create folder if it doesn't exist
    folder_name = "scraped_content"
    if not os.path.exists(folder_name):
        os.makedirs(folder_name)
    
    # Generate filename if not provided
    if not filename:
        # Extract domain name for filename
        domain = url.split('//')[-1].split('/')[0].replace('.', '_')
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"{folder_name}/{domain}_{timestamp}.txt"
    else:
        # Ensure filename is in the folder
        filename = f"{folder_name}/{filename}"
    
    # Save to file
    try:
        with open(filename, 'w', encoding='utf-8') as file:
            file.write(f"URL: {url}\n")
            file.write(f"Scraped at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
            file.write("=" * 80 + "\n\n")
            file.write(clean_text)
        
        print(f"✅ Content successfully saved to: {filename}")
        print(f"📄 File size: {os.path.getsize(filename)} bytes")
        return filename
    except Exception as e:
        print(f"Error saving file: {e}")
        return None

# Main execution
if __name__ == "__main__":
    # Take input from user
    user_input = input("Enter website URL(s) (separated by comma if multiple): ").strip()
    
    # Split by comma to get multiple URLs
    urls = [url.strip() for url in user_input.split(',')]
    
    print("🚀 Starting web scraping...")
    print("-" * 50)
    
    # Scrape each URL
    saved_files = []
    for url in urls:
        # Check if the URL has a scheme, if not, prepend https://
        if not url.startswith(('http://', 'https://')):
            url = 'https://' + url
        print(f"\n🌐 Scraping: {url}")
        saved_file = scrape_edzeb(url)
        if saved_file:
            saved_files.append(saved_file)
    
    print("\n" + "=" * 50)
    print("📊 Scraping Summary:")
    print(f"✅ Successfully saved {len(saved_files)} file(s)")
    
    if saved_files:
        print("\n📁 Saved files:")
        for file in saved_files:
            print(f"  • {os.path.basename(file)}")
        
        print(f"\n📂 All files are saved in: {os.path.abspath('scraped_content')}")