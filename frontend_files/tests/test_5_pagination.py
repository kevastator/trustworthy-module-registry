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

def test_pagination_next(setup):
    driver = setup
    driver.find_element(By.CSS_SELECTOR, ".search-btn").click()
    time.sleep(3)
    next_button = driver.find_element(By.CSS_SELECTOR, ".pagination-next")
    next_button.click()
    time.sleep(3)
    assert "page 2" in driver.page_source.lower()

def test_pagination_prev(setup):
    driver = setup
    driver.find_element(By.CSS_SELECTOR, ".pagination-prev").click()
    time.sleep(3)
    assert "page 1" in driver.page_source.lower()
