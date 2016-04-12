import os
import xml.etree.ElementTree as ET

import pytest
from selenium import webdriver
from selenium.webdriver.common.by import By

from ssv.ssv import SSV


class TestUnit:
    def test_bad_svg(self):
        with pytest.raises(ET.ParseError):
            SSV([0], 'Title', os.path.join('testing', 'data', 'bad_svg.svg'))

    def element_name_collision(self):
        pass

    def incompatible_svg(self):
        pass

    def ssv_bad_initialization(self):
        pass

    def element_bad_initialization(self):
        pass

    def condition_bad_initialization(self):
        pass


# System tests
class TestSystem:
    def test_build_examples(self):
        import examples
        assert all(examples.run())

    @pytest.fixture
    def driver(self, request):
        _driver = webdriver.Chrome()

        def driver_teardown():
            _driver.quit()
        request.addfinalizer(driver_teardown)

        return _driver

    def test_examples(self, driver):
        base_dir = os.path.dirname(os.path.dirname(__file__))
        for example in ['example_%d' % i for i in range(1, 5)]:
            path = os.path.join(base_dir, 'examples', example, '%s.html' % example)
            driver.get("file:///%s" % path)
            assert driver.find_element(By.XPATH, '//body').get_attribute("JSError") is None