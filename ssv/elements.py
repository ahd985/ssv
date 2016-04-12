import numpy as np

from ssv.data_validators import validate_array, validate_colors, validate_array_slices


# Inheritable class for all element subclasses
class Element:
    input_types_allowed = {
        'type': str,
        'report': bool,
        'description': str,
    }

    validate_inputs = {
        'data': lambda a, b, c, d, e: validate_array(a, b, 'float', c, d, e),
        'data_dynamic': lambda a, b, c, d, e: validate_array(a, b, 'float', c, d, e),
        'color_scale': lambda a, b, c, d, e: validate_array(a, b, 'str', 1, 1) and validate_colors(a, b),
        'color_levels': lambda a, b, c, d, e: validate_array(a, b, 'float', 1, 1),
        'headers': lambda a, b, c, d, e: validate_array(a, b, 'str', 1, 1),
    }

    required_inp_by_type = {
        'info': {'inputs': ['data', 'description'], 'dims': {'min': 1, 'max': 2}}
    }

    def __init__(self, element_ids, element_description, x_series_len, element_report_id):
        self.ids = element_ids
        if not isinstance(element_description, str):
            raise TypeError('\'element_description\' for \'%s\' must be a string.' % element_description)
        self.description = element_description
        if not element_report_id is None and not isinstance(element_report_id, str):
            raise TypeError('\'element_report_id\' for \'%s\' must be a string.' % element_description)
        self.x_series_len = x_series_len
        self.report_id = element_report_id
        self.conditions = []

    def add_condition_post_hook(self, **kwargs):
        pass

    def add_condition(self, condition_type, unit='', opacity=1.0, report=True, **kwargs):
        if not isinstance(condition_type, str):
            raise TypeError("condition_type must be of type str")
        if not isinstance(unit, str):
            raise TypeError("unit must be of type str")
        if not isinstance(opacity, (int, float)):
            raise TypeError("opacity must be a float or an int")
        if not isinstance(report, bool):
            raise TypeError("report must be of type boolean")

        if not condition_type in self.required_inp_by_type:
            raise ValueError('condition type \'%s\' not supported' % condition_type)

        for required_inp in self.required_inp_by_type[condition_type]['inputs']:
            if not required_inp in kwargs:
                raise AttributeError('condition attribute \'%s\' is required for condition type '
                                     '\'%s\'' % (required_inp, condition_type))

        for key, val in kwargs.items():
            # Check for proper input type
            if key in self.input_types_allowed and not isinstance(kwargs[key], self.input_types_allowed[key]):
                raise TypeError('condition input \'%s\' must be of type \'%s\'' %
                                (key, self.input_types_allowed[key]))

            # Validate data
            if key in self.validate_inputs:
                if 'dims' in self.required_inp_by_type[condition_type]:
                    min_max = self.required_inp_by_type[condition_type]['dims']
                    val = self.validate_inputs[key](val, key, min_max['min'], min_max['max'], self.x_series_len)
                else:
                    val = self.validate_inputs[key](val, key)
            kwargs[key] = val

        # Set condition
        condition_id = '%s_%d' % ('_'.join(self.ids), len(self.conditions))
        condition = Condition(condition_id, type=condition_type, unit=unit, opacity=opacity, report=report, **kwargs)
        self.conditions.append(condition)

        # Send function input to post hook
        kwargs.update(dict(type=condition_type, unit=unit, opacity=opacity, report=report))
        self.add_condition_post_hook(**kwargs)


class Condition:
    def __init__(self, condition_id, **kwargs):
        self.id = condition_id
        for key, val in kwargs.items():
            setattr(self, key, val)

# Wrapper for cell
class Cell(Element):
    def __init__(self, cell_id, cell_description, x_series_len, cell_report_id=None):
        super(Cell, self).__init__(cell_id, cell_description, x_series_len, cell_report_id)
        self.input_types_allowed.update({'max_height': (float, int), 'data_dynamic': list, 'true_color': str,
                                         'false_color': str, 'overlay': str})
        base_required = ['data']
        self.required_inp_by_type.update({'level_static': {'inputs': base_required + ['max_height', 'min_height'],
                                                           'dims': {'min': 1, 'max': 1}},
                                          'level_dynamic': {'inputs': base_required + ['max_height', 'min_height',
                                                                                       'data_dynamic',
                                                                                       'description_dynamic',
                                                                                       'color_scale', 'color_levels'],
                                                            'dims': {'min': 1, 'max': 1}},
                                          'background': {'inputs': base_required + ['color_scale', 'color_levels'],
                                                         'dims': {'min': 1, 'max': 1}},
                                          'logical': {'inputs': base_required + ['true_color', 'false_color'],
                                                      'dims': {'min': 1, 'max': 1}},
                                          'zonal_y': {'inputs': base_required + ['max_height', 'min_height',
                                                                                 'data_dynamic', 'description_dynamic',
                                                                                 'color_scale', 'color_levels'],
                                                      'dims': {'min': 2, 'max': None}}})

    # Overwrite super's add_condition_post_hook function to handle special conditions
    def add_condition_post_hook(self, **kwargs):
        # Logic for level_dynamic and zonal_y - Add in special function to handle multi-dimensional data reporting
        if kwargs['type'] == 'level_dynamic' or kwargs['type'] == 'zonal_y':
            kwargs_dynamic = {'type': 'info',
                              'data': kwargs['data_dynamic'],
                              'description': kwargs['description_dynamic']}

            unit = kwargs['unit_dynamic'] if 'unit_dynamic' in kwargs else ''
            condition_id = '%s_%s' % ('_'.join(self.ids), 'dynamic')
            condition = Condition(condition_id, unit=unit, **kwargs_dynamic)
            self.conditions.append(condition)

# Wrapper for line
class Line(Element):
    def __init__(self, line_id, line_description, x_series_len, line_report_id=None):
        super(Line, self).__init__(line_id, line_description, x_series_len, line_report_id)
        base_required = ['data']
        self.required_inp_by_type.update({'equal_y': {'inputs': base_required + ['color_scale', 'color_levels'],
                                                      'dims': {'min': 2, 'max': 2}}})

# Wrapper for heatmap
class Heatmap(Element):
    def __init__(self, heatmap_id, heatmap_description, x_series_len, heatmap_report_id=None):
        super(Heatmap, self).__init__(heatmap_id, heatmap_description, x_series_len, heatmap_report_id)
        base_required = ['data']
        self.required_inp_by_type.update({'rect': {'inputs': base_required + ['color_scale', 'color_levels'],
                                                   'dims': {'min': 3, 'max': 3}}})

# Wrapper for toggle
class Toggle(Element):
    def __init__(self, toggle_id, toggle_description, x_series_len, toggle_report_id=None):
        super(Toggle, self).__init__(toggle_id, toggle_description, x_series_len, toggle_report_id)
        base_required = ['data']
        self.required_inp_by_type.update({'show_hide': {'inputs': base_required,
                                                        'dims': {'min': 1, 'max': 1}}})

# Wrapper for report
class Report(Element):
    def __init__(self, report_id, report_description, x_series_len):
        super(Report, self).__init__('', report_description, x_series_len, report_id[0])


# Wrapper for table
class Table(Element):
    def __init__(self, report_id, report_description, x_series_len, data, headers):
        super(Table, self).__init__('', report_description, x_series_len, report_id[0])
        self.required_inp_by_type.update({'info': {'inputs': ['data', 'headers'],
                                                   'dims': {'min': 3, 'max': 3}}})

        # Update array validation for string
        self.validate_inputs.update({'data': lambda a, b, c, d, e: validate_array_slices(a, b, 'str')})

        # Add info and remove ability to add additional conditions to element
        self.add_condition('info', data=data, headers=headers)
        self.add_condition = None

# Wrapper for color scale legend
class ColorScale:
    def __init__(self, color_scale, color_levels, color_scale_desc, color_scale_id):
        if not isinstance(color_scale, list) or not isinstance(color_levels, list):
            raise TypeError('color_scale and color_levels must be a list.')
        if not isinstance(color_scale_id, str):
            raise TypeError('color_scale_id must be a string.')
        if not isinstance(color_scale_desc, str):
            raise TypeError('color_scale_desc must be a string.')

        self.scale = color_scale
        self.levels = color_levels
        self.desc = color_scale_desc
        self.id = color_scale_id
