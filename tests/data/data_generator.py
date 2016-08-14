from collections import defaultdict
import copy
import itertools

import numpy as np


def get_element_input(valid, element_type):
    base_element_args = [
        # id
        {
            'valid': ['ID'],
            'invalid': {}
        },
        # description
        {
            'valid': ['Description', ''],
            'invalid': {'TypeError': [True, 1]}
        },
        # x_series
        {
            'valid': [[i for i in range(10)]],
            'invalid': {}
        },
    ]

    report_id_args = [{'valid': ['REPORT_ID'], 'invalid': {'TypeError': [True, 1]}}]
    data_args = [{'valid': [np.random.rand(10, 3)], 'invalid': {}}]
    headers_args = [{'valid': [['H1', '', 'H3']], 'invalid': {}}]
    color_scale_args = [{'valid': [['#DDDDDD','#DDDDDD']], 'invalid': {'ValueError': ['#ZZZ', 'RGB(1,1,1)']}}]
    color_level_args = [{'valid': [[100, 200]], 'invalid': {}}]
    opacity_args = [{'valid': [1, 1.0], 'invalid': {'TypeError': ['X']}}]

    element_args = {
        'cell': base_element_args + report_id_args,
        'line': base_element_args + report_id_args,
        'heatmap': base_element_args + report_id_args,
        'toggle': base_element_args + report_id_args,
        'report': base_element_args,
        'table': base_element_args + data_args + headers_args,
        'legend': base_element_args + color_scale_args + color_level_args + opacity_args
    }

    valid_args = [i['valid'] for i in element_args[element_type.lower()]]
    if valid:
        return list(itertools.product(*valid_args))
    else:
        valid_args = [[arg[0]] for arg in valid_args]
        invalid_args = defaultdict(list)
        for i in range(len(valid_args)):
            arg_combo = valid_args.copy()
            for k, v in element_args[element_type.lower()][i]['invalid'].items():
                arg_combo[i] = v
                invalid_args[k] += list(itertools.product(*arg_combo))

        return invalid_args


def get_condition_input(valid, condition_type):
    condition_kwargs = {
        'report': {'valid': [True, False], 'invalid': {'TypeError': [1, 'True']}},
        'section_label': {'valid': ['Section', ''], 'invalid': {'TypeError': [1, True]}},
        'description': {'valid': ['Description', ''], 'invalid': {'TypeError': [1, True]}},
        'overlay': {'valid': ['water'], 'invalid': {'TypeError': [1, True]}},
        'unit': {'valid': ['unit', ''], 'invalid': {'TypeError': [1, True]}},
    }

    color_legend_args = [
        # Color scale
        {'valid': [['#DDDDDD', '#DDDDDD']], 'invalid': {'ValueError': ['XX']}},
        # Color levels
        {'valid': [[100, 200]], 'invalid': {'ValueError': ['XX']}},
    ]

    true_false_color_args = [
        {'valid': ['#FFFFFF', '#FFF'], 'invalid': {'ValueError': ['#ZZZ', 'RGB(1,1,1)']}},
        {'valid': ['#FFFFFF', '#FFF'], 'invalid': {'ValueError': ['#ZZZ', 'RGB(1,1,1)']}}
    ]

    dynamic_args = [
        # Description
        {'valid': ['Description', ''], 'invalid': {'TypeError': [1, True]}},
        # Unit
        {'valid': ['unit', ''], 'invalid': {'TypeError': [1, True]}}
    ]

    height_args = [
        # Min
        {'valid': [9], 'invalid': {'TypeError': ['XX']}},
        # Max
        {'valid': [10], 'invalid': {'TypeError': ['XX']}}
    ]

    data_1d_arg = [{'valid': [[100] * 10], 'invalid': {'ValueError': [['xx'] * 8]}}]
    data_2d_arg = [{'valid': [[[100] * 10] * 10], 'invalid': {'ValueError': [['xx'] * 8]}}]
    data_3d_arg = [{'valid': [[[[100] * 10] * 10] * 10], 'invalid': {'ValueError': [['xx'] * 8]}}]

    condition_args = {
        'info': data_1d_arg,
        'background': data_1d_arg + color_legend_args,
        'staticlevel': data_1d_arg + color_legend_args + height_args,
        'dynamiclevel': data_1d_arg + data_1d_arg + color_legend_args + height_args + dynamic_args,
        'logical': data_1d_arg + true_false_color_args,
        'zonaly': data_2d_arg + data_2d_arg + color_legend_args + height_args + dynamic_args,
        'equaly': data_2d_arg + color_legend_args,
        'rect': data_3d_arg + color_legend_args,
        'showhide': data_1d_arg,
    }

    valid_args = [i['valid'] for i in condition_args[condition_type.lower()]]

    kwargs = {k: condition_kwargs[k]['valid'] for k in condition_kwargs}
    condition_kwarg_combos = []
    kwarg_names = list(kwargs.keys())
    for k in kwarg_names:
        condition_kwarg_combos += [[(k, v) for v in kwargs[k]]]
    condition_kwarg_combos = [dict(d) for d in itertools.product(*condition_kwarg_combos)]

    if valid:
        return list(itertools.product(*valid_args)), condition_kwarg_combos
    else:
        valid_args = [[arg[0]] for arg in valid_args]
        valid_kwargs = [[(k, v)] for k, v in condition_kwarg_combos[0].items()]

        invalid_combos = defaultdict(list)

        # Extract invalid args
        for i in range(len(valid_args)):
            arg_combo = valid_args.copy()
            for k, v in condition_args[condition_type.lower()][i]['invalid'].items():
                arg_combo[i] = v
                all_arg_combos = list(itertools.product(*arg_combo))
                invalid_combos[k] += list(zip(all_arg_combos,
                                              [dict([i[0] for i in valid_kwargs])] * len(all_arg_combos)))

        # Extract invalid kwargs
        kwarg_names = [t[0][0] for t in valid_kwargs]
        for i, k in enumerate(kwarg_names):
            kwarg_combo = copy.deepcopy(valid_kwargs)
            for k_error, v in condition_kwargs[k]['invalid'].items():
                kwarg_combo[i] = ((k, p) for p in v)
                all_kwarg_combos = [dict(d) for d in itertools.product(*kwarg_combo)]
                invalid_combos[k_error] += list(zip([i for i in valid_args] * len(all_kwarg_combos), all_kwarg_combos))

        return invalid_combos
