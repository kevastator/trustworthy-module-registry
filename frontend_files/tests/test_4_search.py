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

def test_default_search(setup):
    driver = setup
    driver.find_element(By.CSS_SELECTOR, ".search-btn").click()
    time.sleep(3)
    results = driver.find_elements(By.CSS_SELECTOR, ".result-card")
    assert len(results) > 0, "No results found for default search."

def test_search_by_name(setup):
    driver = setup
    driver.find_element(By.NAME, "name").send_keys("test-package")
    driver.find_element(By.CSS_SELECTOR, ".search-btn").click()
    time.sleep(3)
    results = driver.find_elements(By.CSS_SELECTOR, ".result-card")
    assert len(results) > 0, "No results for search by name."

def test_search_by_name_and_version(setup):
    driver = setup
    driver.find_element(By.NAME, "name").send_keys("test-package")
    driver.find_element(By.NAME, "version").send_keys("1.2.3")
    driver.find_element(By.CSS_SELECTOR, ".search-btn").click()
    time.sleep(3)
    results = driver.find_elements(By.CSS_SELECTOR, ".result-card")
    assert len(results) > 0, "No results for search by name and version."
