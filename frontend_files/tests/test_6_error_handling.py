from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import time
import pytest

@pytest.fixture
def setup():
    driver = webdriver.Chrome()
    driver.get("http://ec2-52-200-57-221.compute-1.amazonaws.com/search.html")
    yield driver
    driver.quit()

def test_invalid_search(setup):
    driver = setup
    driver.find_element(By.NAME, "name").send_keys("nonexistent-package")
    driver.find_element(By.CSS_SELECTOR, ".search-btn").click()
    time.sleep(3)
    assert "no valid results" in driver.page_source.lower()
