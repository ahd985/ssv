import os
import random
import string
import xml.etree.ElementTree as ET

import numpy as np
import pytest
from selenium import webdriver
from selenium.webdriver.common.by import By

from ssv.ssv import SSV
from ssv.data_validators import validate_array, validate_colors, validate_array_slices, validate_color
from ssv.elements import Cell, Line, Heatmap, Toggle, Report, Table, ColorScale


class TestDataValidators:
    @pytest.fixture(scope='class', params=[(10, 0, 0), (10, 10, 0), (10, 10, 10)])
    def arr_num(self, request):
        return np.random.rand(*request.param)

    @pytest.fixture(scope='class', params=[(10, 0), (10, 10)])
    def arr_str(self, request):
        hex_chars = list(string.ascii_uppercase[:6]) + [str(i) for i in range(10)]
        hex_row = ['#' + ''.join([random.choice(hex_chars) for i in range(6)]) for j in range(len(request.param))]
        if request.param[1] > 0:
            hex_arr = [hex_row for i in range(len(request.param))]
        else:
            hex_arr = hex_row
        return np.array(hex_arr)

    def test_validate_array_num(self, arr_num):
        # Cycle through allowable min_dim values
        for i in range(1, len(arr_num.shape)+1):
            validate_array(arr_num, 'test_data', 'float', i, len(arr_num.shape), arr_num.shape[0])

        # Check unbounded dims
        validate_array(arr_num, 'test_data', 'float', None)

    def test_validate_array_str(self, arr_str):
        # Cycle through allowable min_dim values
        for i in range(1, len(arr_str.shape) + 1):
            validate_array(arr_str, 'test_data', 'str', i, len(arr_str.shape), arr_str.shape[0])

        # Check unbounded dims
        validate_array(arr_str, 'test_data', 'str', None)

    def test_validate_array_fail(self, arr_num):
        # Fail on min_dim being too high
        with pytest.raises(ValueError):
            validate_array(arr_num, 'test_data', 'float', len(arr_num.shape)+1, len(arr_num.shape), arr_num.shape[0])
        # Fail on max_dim being too low
        with pytest.raises(ValueError):
            validate_array(arr_num, 'test_data', 'float', 0, len(arr_num.shape)-1, arr_num.shape[0])
        # Fail dim 0 len + 1
        with pytest.raises(ValueError):
            validate_array(arr_num, 'test_data', 'float', 0, len(arr_num.shape) - 1, arr_num.shape[0]+1)
        # Fail dim 0 len - 1
        with pytest.raises(ValueError):
            validate_array(arr_num, 'test_data', 'float', 0, len(arr_num.shape) - 1, arr_num.shape[0]-1)

    def test_validate_array_dim_mismatch(self):
        arr = [[1, 2, 3, 0], [0, 0, 3]]
        with pytest.raises(ValueError):
            validate_array(arr, 'test_data', 'float', None)

    def test_validate_array_num_bad_type(self):
        arr = [[1, 2, 3, 'x'], ['z', 0, 3, 2]]
        with pytest.raises(ValueError):
            validate_array(arr, 'test_data', 'float', None)

    def test_validate_array_slices(self):
        arr = [np.random.rand(3, 3)] + [np.random.rand(5, 5)] + [np.random.rand(7, 7)]
        validate_array_slices(arr, 'test_data', 'float')

    def test_validate_array_slices_fail(self):
        arr = [np.random.rand(3, 3)] + [np.random.rand(5, 5)] + [np.array([[1, 2],[1, 2, 3]])]
        with pytest.raises(ValueError):
            validate_array_slices(arr, 'test_data', 'float')

    def test_validate_colors(self, arr_str):
        validate_colors(arr_str, 'test_data')

    def test_validate_colors_fail(self, arr_str):
        arr_str[0] = 'RGB(1,1,1)'
        arr_str[1] = 'NXSKJNLVD'
        with pytest.raises(ValueError):
            validate_colors(arr_str, 'test_data')

    def test_validate_color(self):
        validate_color('#FFFFFF', 'test_data')

class TestElements:
    @pytest.fixture(scope='class', params=[])
    def arr_num(self, request):
        return np.random.rand(*request.param)


class TestSSV:
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