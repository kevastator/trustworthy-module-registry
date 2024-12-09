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

def test_upload_file(setup):
    driver = setup
    driver.find_element(By.ID, "packageName").send_keys("test-package-file")
    file_input = driver.find_element(By.ID, "dragDropZone")
    file_input.send_keys("../test_package/461-acme-service-main.zip")
    driver.find_element(By.ID, "uploadPackageButton").click()
    time.sleep(3)
    assert "Success: Package uploaded." in driver.find_element(By.ID, "responseBox").text

def test_upload_url(setup):
    driver = setup
    driver.find_element(By.ID, "packageName").send_keys("test-package-url")
    driver.find_element(By.ID, "packageURL").send_keys("https://github.com/kevastator/461-acme-service")
    driver.find_element(By.ID, "uploadPackageButton").click()
    time.sleep(3)
    assert "Success: Package uploaded." in driver.find_element(By.ID, "responseBox").text

def test_upload_error_handling(setup):
    driver = setup
    driver.find_element(By.ID, "uploadPackageButton").click()
    time.sleep(3)
    assert "Error: Package name is required." in driver.find_element(By.ID, "responseBox").text
