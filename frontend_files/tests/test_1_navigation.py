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
    driver.get("http://ec2-52-200-57-221.compute-1.amazonaws.com")
    yield driver
    driver.quit()

def test_nav_links(setup):
    driver = setup
    driver.find_element(By.LINK_TEXT, "Contact").click()
    time.sleep(2)
    assert "contact" in driver.current_url.lower()
