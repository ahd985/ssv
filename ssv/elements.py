import numpy as np

from ssv.data_validators import validate_array, validate_colors, validate_array_slices, validate_color


# Flexible validator wrappers
# Validators get passed 3 arguments:
#   1: parameter being validated
#   2: parameter name
#   3: length of x_series of element(not always used)
_validate_color_scale = lambda a, b, c: validate_array(a, b, 'str', 1, 1) if validate_colors(a, b) else None
_validate_color_levels = lambda a, b, c: validate_array(a, b, 'float', 1, 1)
_validate_1d_numeric = lambda a, b, c: validate_array(a, b, 'float', 1, 1, c)


# Inheritable class for all element subclasses
class Element:
    def __init__(self, element_ids, element_description, x_series_len, element_report_id):
        self.ids = element_ids
        if not isinstance(element_description, str):
            raise TypeError('\'element_description\' for \'%s\' must be a string.' % element_description)
        self.description = element_description
        if not element_report_id is None and not isinstance(element_report_id, str):
            raise TypeError('\'element_report_id\' for \'%s\' must be a string.' % element_description)
        self.x_series_len = x_series_len
        self.report_id = element_report_id

        self._input_types_allowed = {
            'type': str,
            'report': bool,
            'description': str,
            'description_dynamic': str,
            'max_height': (float, int),
            'min_height': (float, int),
            'true_color': str,
            'false_color': str,
            'overlay': str,
            'unit_dynamic': str
        }

        self._required_validation = {
            'info': {
                'data': _validate_1d_numeric
            }
        }

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

        if not condition_type in self._required_validation:
            raise ValueError('condition type \'%s\' not supported' % condition_type)

        for required in self._required_validation[condition_type]:
            if not required in kwargs:
                raise AttributeError('condition attribute \'%s\' is required for condition type '
                                     '\'%s\'' % (required, condition_type))

        for key, val in kwargs.items():
            # Check for proper input type
            if key in self._input_types_allowed and not isinstance(kwargs[key], self._input_types_allowed[key]):
                raise TypeError('condition input \'%s\' must be of type \'%s\'' %
                                (key, self._input_types_allowed[key]))

            # Validate data
            if key in self._required_validation[condition_type] and \
                    not self._required_validation[condition_type][key] is None:
                val = self._required_validation[condition_type][key](val, key, self.x_series_len)
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
        self._required_validation.update({
            'level_static': {
                'data': _validate_1d_numeric,
                'max_height': None,
                'min_height': None
            },
            'level_dynamic': {
                'data': _validate_1d_numeric,
                'max_height': None,
                'min_height': None,
                'data_dynamic': _validate_1d_numeric,
                'description_dynamic': None,
                'color_scale': _validate_color_scale,
                'color_levels': _validate_color_levels
            },
            'background': {
                'data': _validate_1d_numeric,
                'color_scale': _validate_color_scale,
                'color_levels': _validate_color_levels
            },
            'logical': {
                'data': _validate_1d_numeric,
                'true_color': lambda a, b, c: validate_color(a, b),
                'false_color': lambda a, b, c: validate_color(a, b)
            },
            'zonal_y': {
                'data': lambda a, b, c: validate_array(a, b, 'float', 2, 2, c),
                'max_height': None,
                'min_height': None,
                'data_dynamic': None,
                'description_dynamic': None,
                'color_scale': _validate_color_scale,
                'color_levels': _validate_color_levels
            },
        })

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
        self._required_validation.update({
            'equal_y': {
                'data': lambda a, b, c: validate_array(a, b, 'float', 2, 2, c),
                'color_scale': _validate_color_scale,
                'color_levels': _validate_color_levels,
            }
        })


# Wrapper for heatmap
class Heatmap(Element):
    def __init__(self, heatmap_id, heatmap_description, x_series_len, heatmap_report_id=None):
        super(Heatmap, self).__init__(heatmap_id, heatmap_description, x_series_len, heatmap_report_id)
        self._required_validation.update({
            'rect': {
                'data': lambda a, b, c: validate_array(a, b, 'float', 3, 3, c),
                'color_scale': _validate_color_scale,
                'color_levels': _validate_color_levels
            }
        })

# Wrapper for toggle
class Toggle(Element):
    def __init__(self, toggle_id, toggle_description, x_series_len, toggle_report_id=None):
        super(Toggle, self).__init__(toggle_id, toggle_description, x_series_len, toggle_report_id)
        self._required_validation.update({
            'show_hide': {
                'data': _validate_1d_numeric
            }
        })

# Wrapper for report
class Report(Element):
    def __init__(self, report_id, report_description, x_series_len):
        super(Report, self).__init__('', report_description, x_series_len, report_id[0])


# Wrapper for table
class Table(Element):
    def __init__(self, report_id, report_description, x_series_len, data, headers):
        super(Table, self).__init__('', report_description, x_series_len, report_id[0])
        self._required_validation.update({
            'info': {
                'data': lambda a, b, c: validate_array_slices(a, b, 'str'),
                'headers': lambda a, b, c: validate_array(a, b, 'str', 1, 1, None)
            }
        })

        # Add info and remove ability to add additional conditions to element
        self.add_condition('info', data=data, headers=headers)
        self.add_condition = None

# Wrapper for color scale legend
class ColorScale:
    def __init__(self, color_scale, color_levels, color_scale_desc, color_scale_id):
        validate_colors(color_scale, 'color_scale')
        validate_array(color_levels, 'color_levels', 'float', 1, 1)
        if not isinstance(color_scale_id, str):
            raise TypeError('color_scale_id must be a string.')
        if not isinstance(color_scale_desc, str):
            raise TypeError('color_scale_desc must be a string.')

        self.scale = color_scale
        self.levels = color_levels
        self.desc = color_scale_desc
        self.id = color_scale_id
