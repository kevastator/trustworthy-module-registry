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
    driver.get("http://ec2-52-200-57-221.compute-1.amazonaws.com/admin.html")
    yield driver
    driver.quit()

def test_reset_modal_display(setup):
    driver = setup
    driver.find_element(By.CSS_SELECTOR, ".btn-danger").click()
    time.sleep(1)
    modal = driver.find_element(By.ID, "resetModal")
    assert modal.is_displayed(), "Reset modal not displayed."

def test_reset_cancel(setup):
    driver = setup
    driver.find_element(By.CSS_SELECTOR, ".btn-danger").click()
    time.sleep(1)
    modal = driver.find_element(By.ID, "resetModal")
    driver.find_element(By.CSS_SELECTOR, ".btn-secondary").click()
    time.sleep(1)
    assert not modal.is_displayed(), "Reset modal still displayed."

def test_reset_confirm(setup):
    driver = setup
    driver.find_element(By.CSS_SELECTOR, ".btn-danger").click()
    time.sleep(1)
    modal = driver.find_element(By.ID, "resetModal")
    driver.find_element(By.ID, "confirmResetButton").click()
    time.sleep(1)
    assert "Database successfully reset!" in driver.find_element(By.ID, "responseBox").text
