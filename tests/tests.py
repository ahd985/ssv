import itertools
import json
import os
import random
import string
import time
import xml.etree.ElementTree as ET

import numpy as np
import pytest
from selenium import webdriver
from selenium.webdriver.common.by import By

from ssv import SSV
from ssv.data_validators import validate_array, validate_colors, validate_array_slices, validate_color
from tests.data import data_generator
from ssv.elements import Element


def get_subclass_from_name(cls, name):
    for sub_cls in cls.__subclasses__():
        if sub_cls.__name__.lower() == name.lower():
            return sub_cls


class TestDataValidators:
    @pytest.fixture(scope='class', params=[[10], [10, 10], [10, 10, 10]])
    def arr_num(self, request):
        return np.random.rand(*request.param)

    @pytest.fixture(scope='class', params=[[10], [10, 10]])
    def arr_str(self, request):
        hex_chars = list(string.ascii_uppercase[:6]) + [str(i) for i in range(10)]
        hex_row = ['#' + ''.join([random.choice(hex_chars) for i in range(6)]) for j in range(request.param[0])]
        if len(request.param) > 1 and request.param[1] > 0:
            hex_arr = [hex_row for i in range(len(request.param))]
        else:
            hex_arr = hex_row
        return np.array(hex_arr)

    def test_validate_array_num(self, arr_num):
        # Cycle through allowable min_dim values
        for i in range(1, len(arr_num.shape)+1):
            validate_array(arr_num, 'float', i, len(arr_num.shape), arr_num.shape[0])

        # Check unbounded dims
        validate_array(arr_num, 'float', None)

    def test_validate_array_str(self, arr_str):
        # Cycle through allowable min_dim values
        for i in range(1, len(arr_str.shape) + 1):
            validate_array(arr_str, 'str', i, len(arr_str.shape), arr_str.shape[0])

        # Check unbounded dims
        validate_array(arr_str, 'str', None)

    def test_validate_array_fail(self, arr_num):
        # Fail on min_dim being too high
        with pytest.raises(ValueError):
            validate_array(arr_num, 'float', len(arr_num.shape)+1, len(arr_num.shape), arr_num.shape[0])
        # Fail on max_dim being too low
        with pytest.raises(ValueError):
            validate_array(arr_num, 'float', 0, len(arr_num.shape)-1, arr_num.shape[0])
        # Fail dim 0 len + 1
        with pytest.raises(ValueError):
            validate_array(arr_num, 'float', 0, len(arr_num.shape) - 1, arr_num.shape[0]+1)
        # Fail dim 0 len - 1
        with pytest.raises(ValueError):
            validate_array(arr_num, 'float', 0, len(arr_num.shape) - 1, arr_num.shape[0]-1)

    def test_validate_array_dim_mismatch(self):
        arr = [[1, 2, 3, 0], [0, 0, 3]]
        with pytest.raises(ValueError):
            validate_array(arr, 'float', None)

    def test_validate_array_num_bad_type(self):
        arr = [[1, 2, 3, 'x'], ['z', 0, 3, 2]]
        with pytest.raises(ValueError):
            validate_array(arr, 'float', None)

    def test_validate_array_slices(self):
        arr = [np.random.rand(3, 3)] + [np.random.rand(5, 5)] + [np.random.rand(7, 7)]
        validate_array_slices(arr, 'float')

    def test_validate_array_slices_fail(self):
        arr = [np.random.rand(3, 3)] + [np.random.rand(5, 5)] + [np.array([[1, 2],[1, 2, 3]])]
        with pytest.raises(ValueError):
            validate_array_slices(arr, 'float')

    def test_validate_colors(self, arr_str):
        validate_colors(arr_str)

    def test_validate_colors_fail(self, arr_str):
        arr_str[0] = 'RGB(1,1,1)'
        arr_str[1] = 'NXSKJNLVD'
        with pytest.raises(ValueError):
            validate_colors(arr_str)

    def test_validate_color(self):
        validate_color('#FFFFFF')


class TestElements:
    @pytest.fixture(scope='class', params=[cls for cls in Element.__subclasses__()])
    def element_input_valid(self, request):
        return request.param, data_generator.get_element_input(True, request.param.__name__)

    @pytest.fixture(scope='class', params=[cls for cls in Element.__subclasses__()])
    def element_input_invalid(self, request):
        return request.param, data_generator.get_element_input(False, request.param.__name__)

    def test_valid_element_inputs(self, element_input_valid):
        cls, arg_combos = element_input_valid
        for args in arg_combos:
            cls(*args)

    def test_invalid_element_inputs(self, element_input_invalid):
        cls, arg_combos_by_error = element_input_invalid
        for error_name, arg_combos in arg_combos_by_error.items():
            error_cls = get_subclass_from_name(Exception, error_name)
            for args in arg_combos:
                with pytest.raises(error_cls):
                    cls(*args)

    _condition_test_classes = [cls for cls in Element.__subclasses__() if cls.__name__ not in ['Table', 'ColorScale']]

    @pytest.mark.parametrize("cls", _condition_test_classes)
    def test_valid_condition_inputs(self, cls):
        cls_args = data_generator.get_element_input(True, cls.__name__)[0]
        element = cls(*cls_args)
        for condition_type in element._allowed_conditions:
            condition_arg_combos, condition_kwarg_combos = data_generator.get_condition_input(True, condition_type)
            for condition_args in condition_arg_combos:
                for condition_kwargs in condition_kwarg_combos:
                    cls(*cls_args).add_condition(condition_type, *condition_args, **condition_kwargs)

    @pytest.mark.parametrize("cls", _condition_test_classes)
    def test_invalid_condition_inputs(self, cls):
        cls_args = data_generator.get_element_input(True, cls.__name__)[0]
        element = cls(*cls_args)
        for condition_type in element._allowed_conditions:
            condition_combos_by_error = data_generator.get_condition_input(False, condition_type)
            for error_name, combos in condition_combos_by_error.items():
                error_cls = get_subclass_from_name(Exception, error_name)
                for args_kwargs in combos:
                    with pytest.raises(error_cls):
                        print(error_cls, condition_type, args_kwargs[0], args_kwargs[1])
                        cls(*cls_args).add_condition(condition_type, *args_kwargs[0], **args_kwargs[1])

    """
    _condition_test_classes = [cls for cls in Element.__subclasses__() if cls.__name__ not in ['Table', 'ColorScale']]

    @pytest.mark.parametrize("cls", _condition_test_classes)
    def test_valid_condition_inputs(self, cls):
        cls_args = data_generator.get_element_input(True, cls.__name__)[0]
        element = cls(*cls_args)
        for condition_type, condition_inputs in element._required_validation.items():
            condition_kwarg_combos = \
                data_generator.get_condition_input(True, list(condition_inputs.keys()))
            for condition_kwargs in condition_kwarg_combos:
                cls(*cls_args).add_condition(condition_type, **condition_kwargs)

    @pytest.mark.parametrize("cls", _condition_test_classes)
    def test_invalid_condition_inputs(self, cls):
        cls_args = data_generator.get_element_input(True, cls.__name__)[0]
        element = cls(*cls_args)
        for condition_type, condition_inputs in element._required_validation.items():
            condition_kwarg_combos_by_error = data_generator.get_condition_input(False, list(condition_inputs.keys()))
            for error_name, condition_kwarg_combos in condition_kwarg_combos_by_error.items():
                error_cls = get_subclass_from_name(Exception, error_name)
                for condition_kwargs in condition_kwarg_combos:
                    with pytest.raises(error_cls):
                        cls(*cls_args).add_condition(condition_type, **condition_kwargs)
    """


class TestSSV:
    _good_svg_path = os.path.join('tests', 'data', 'good_svg.svg')
    _bad_svg_path = os.path.join('tests', 'data', 'bad_svg.svg')
    _valid_inputs = [[[1, 2, 3]], ['x'], [_good_svg_path], ['My Simulation'], [10]]

    def test_valid_instantiation(self):
        for args in list(itertools.product(*self._valid_inputs)):
            SSV.create_vis(*args)

    def test_invalid_instantiation(self):
        # x_series
        with pytest.raises(ValueError):
            invalid_arg_combos = [[args[0]] for args in self._valid_inputs]
            invalid_arg_combos[0] = [['x', 'y', 'z']]
            for invalid_args in list(itertools.product(*invalid_arg_combos)):
                SSV.create_vis(*invalid_args)
        # x_series_unit
        with pytest.raises(TypeError):
            invalid_arg_combos = [[args[0]] for args in self._valid_inputs]
            invalid_arg_combos[1] = [1, True]
            for invalid_args in itertools.product(*invalid_arg_combos):
                SSV.create_vis(*invalid_args)
        # svg_path
        with pytest.raises(FileNotFoundError):
            invalid_arg_combos = [[args[0]] for args in self._valid_inputs]
            invalid_arg_combos[2] = ['']
            for invalid_args in itertools.product(*invalid_arg_combos):
                SSV.create_vis(*invalid_args)
        # title
        with pytest.raises(TypeError):
            invalid_arg_combos = [[args[0]] for args in self._valid_inputs]
            invalid_arg_combos[3] = [1, True]
            for invalid_args in itertools.product(*invalid_arg_combos):
                SSV.create_vis(*invalid_args)
        # font_size
        with pytest.raises(TypeError):
            invalid_arg_combos = [[args[0]] for args in self._valid_inputs]
            invalid_arg_combos[4] = ['x']
            for invalid_args in itertools.product(*invalid_arg_combos):
                SSV.create_vis(*invalid_args)

    def test_bad_svg_(self):
        with pytest.raises(ET.ParseError):
            SSV.create_vis([0], 'Title', os.path.join('tests', 'data', 'bad_svg.svg'))

    def test_element_id_collision(self):
        with pytest.raises(ValueError):
            vis = SSV.create_vis(*[i[0] for i in self._valid_inputs])
            vis.add_element('cell', 'id_1')
            vis.add_element('heatmap', 'id_1')

    def test_from_json(self):
        with open('tests/data/data.json') as f:
            data = json.load(f)
        SSV.from_json(data)


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

            # Wait a few seconds - this can be improved
            time.sleep(1)

            driver.find_element_by_id('play-button').click()

            # Wait a few seconds - this can be improved
            time.sleep(1)
            assert driver.find_element(By.XPATH, '//body').get_attribute("JSError") is None