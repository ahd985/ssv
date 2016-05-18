from ssv.data_validators import validate_array, validate_colors, validate_array_slices, validate_color


# Flexible validator wrappers
# Validators get passed 3 arguments:
#   1: parameter being validated
#   2: parameter name
#   3: length of x_series of element(not always used)
_validate_color_scale = lambda a, b, c: validate_array(a, b, 'str', 1, 1) if validate_colors(a, b) else None
_validate_color_levels = lambda a, b, c: validate_array(a, b, 'float', 1, 1)
_validate_1d_numeric = lambda a, b, c: validate_array(a, b, 'float', 1, 1, c)


class Element:
    """Class representing visualization element.

        This class can represent many real world simulation objects (e.g., vessels, pipes, etc).  Note that
            elements can include "reports" that indicate certain values of the visualization data (e.g., physical
            quantities representing by the cell like pressure and temperature).

        Args:
            element_ids (list[str], str): String id(s) representing the id(s) of the corresponding svg element in the
                svg layout provided by the Vis class.
            element_description (Optional[str]): Description of the visualization element intended representation (e.g.,
                physical objects like 'Reactor Vessel' and 'Steam Pipe').
            x_series_len (int): Length of x-series data for simulation (e.g., time series).
            element_report_id (str): id representing id of corresponding svg element in svg outline provided by
                the Vis class.

        Attributes:
            conditions (list): List of element conditions (see Condition class)
    """

    def __init__(self, element_ids, element_description, x_series_len, element_report_id):
        self.ids = element_ids
        if not isinstance(element_description, str):
            raise TypeError('\'element_description\' must be a string.')
        self.description = element_description
        if not element_report_id is None and not isinstance(element_report_id, str):
            raise TypeError('\'element_report_id\' for \'%s\' must be a string.' % element_description)
        self.x_series_len = x_series_len
        self.report_id = element_report_id

        self._input_types_allowed = {
            'type': str,
            'report': bool,
            'section_label': str,
            'description': str,
            'description_dynamic': str,
            'max_height': (float, int),
            'min_height': (float, int),
            'true_color': str,
            'false_color': str,
            'overlay': str,
            'unit_dynamic': str,
        }

        self._required_validation = {
            'info': {
                'data': lambda a, b, c: validate_array(a, b, 'float', 1, 2, c)
            }
        }

        self.conditions = []

    @staticmethod
    def create(cls_name):
        """Class factory method for Element subclasses.

            Args:
                cls_name (str): Element subclass.

            Returns:
                Element subclass of type cls_name.
        """

        for cls in Element.__subclasses__():
            if cls_name.lower() == cls.__name__.lower():
                return cls

        # If we get to end of function raise error
        raise ValueError('element type \'%s\' is not a supported type.' % cls_name)

    def _add_condition_post_hook(self, **kwargs):
        pass

    def add_condition(self, condition_type, unit='', opacity=1.0, report=True, **kwargs):
        """Method to add visualization condition to internal class property.

        Args:
            condition_type (str): Type of condition to add to element.
            unit (Optional[str]): Description of condition value (e.g., a physical property like psi).
            opacity (Optional[float, int]): Desired opacity of condition given rendered element
            report (bool): Option to report condition data (if element report exists)
            **kwargs: Arbitrary keyword arguments dependant on condition_type.

        Returns:
            New element condition of condition_type.
        """

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
        self._add_condition_post_hook(**kwargs)


class Condition:
    """Class representing element condition.

        This class can represent many physical properties of an object (e.g., water level, pressure, temperature).

        Args:
            condition_id (str): Unique id of condition.
            **kwargs: Arbitrary keyword arguments dependant on condition subclass.
    """

    def __init__(self, condition_id, **kwargs):
        self.id = condition_id
        for key, val in kwargs.items():
            setattr(self, key, val)


# Wrapper for cell
class Cell(Element):
    """Class representing a 'Cell' element.

        A 'Cell' element is generally defined as a 2d surface the user wishes to use to represent some component
            of a visualization system.  Common uses include:
                *Pressure vessels
                *Compartments
                *Tanks
                *Pipes

        A cell can implement the following conditions:
            *level_static - represents a changing vertical portion of the cell with a static color (e.g., can visualize
                water level in a tank with a static temperature)
            *level_dynamic - same as level_static except the color can change with the x-series (e.g., can visualize
                water level in a tank with a dynamic temperature)
            *background - represents the background of a cell with a dynamically changing color (e.g., can visualize
                gas temperature in a compartment)
            *logical - like background but dynamically changes color based on True/False criteria (e.g., can visualize
                pipe opened/closed)
            *zonal_y - represents a vertical multi-zonal model (e.g., can visualize a two or more gas zones in a
                compartment)

        Note that more than one condition can be added to a Cell.  Precedence of condition visualization is based on
            relative height of condition pattern (e.g., a condition calculated to visually cover 60% of a cell [like
            a water level] would be shown overlapping a condition like a background that covers 100% of the cell.
            Users should take take care to account for this ordering in the code.

        Args:
            cell_id (str): unique id of the cell used in conjunction with an svg layout to map the cell.
            cell_description (str): Description of the what the cell physically represents (e.g., a reactor vessel)
            x_series_len (int): Length of x-series data for simulation (e.g., time series).
            cell_report_id (Optional[str]): id representing id of corresponding svg element in svg outline
                provided by the Vis class.
    """

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
                'data_2d': lambda a, b, c: validate_array(a, b, 'float', 2, 2, c),
                'max_height': None,
                'min_height': None,
                'data_dynamic_2d': lambda a, b, c: validate_array(a, b, 'float', 2, 2, c),
                'description_dynamic': None,
                'color_scale': _validate_color_scale,
                'color_levels': _validate_color_levels
            },
        })

    # Overwrite super's add_condition_post_hook function to handle special conditions
    def _add_condition_post_hook(self, **kwargs):
        # Logic for level_dynamic and zonal_y - Add in special function to handle multi-dimensional data reporting
        if kwargs['type'] == 'level_dynamic' or kwargs['type'] == 'zonal_y':
            kwargs_dynamic = {'type': 'info',
                              'description': kwargs['description_dynamic'],
                              'section_label': kwargs['section_label'] if 'section_label' in kwargs else '',
                              'unit': kwargs['unit_dynamic'] if 'unit_dynamic' in kwargs else '',
                              'report': True}
            if kwargs['type'] == 'level_dynamic':
                kwargs_dynamic['data'] = kwargs['data_dynamic']
            elif kwargs['type'] == 'zonal_y':
                kwargs_dynamic['data_2d'] = kwargs['data_dynamic_2d']

            condition_id = '%s_%s' % ('_'.join(self.ids), 'dynamic')
            condition = Condition(condition_id, **kwargs_dynamic)
            self.conditions.append(condition)

# Wrapper for line
class Line(Element):
    """Class representing a 'Line' element.

        A 'Line' element is generally defined as a 1d path of a visualization system.  Common uses include:
                *Pressure vessel walls

        A line can implement the following conditions:
            *equal_y - represents an number of equal-height sections on a path dynamically colored (e.g., can visualize
                temperature distribution in a vessel wall)

        Args:
            line_id (str): unique id of the line used in conjunction with an svg layout to map the line.
            line_description (str): Description of the what the line physically represents (e.g., a vessel wall)
            x_series_len (int): Length of x-series data for simulation (e.g., time series).
            line_report_id (Optional[str]): id representing id of corresponding svg element in svg outline
                provided by the Vis class.
    """

    def __init__(self, line_id, line_description, x_series_len, line_report_id=None):
        super(Line, self).__init__(line_id, line_description, x_series_len, line_report_id)
        self._required_validation.update({
            'equal_y': {
                'data_2d': lambda a, b, c: validate_array(a, b, 'float', 2, 2, c),
                'color_scale': _validate_color_scale,
                'color_levels': _validate_color_levels,
            }
        })


# Wrapper for heatmap
class Heatmap(Element):
    """Class representing a 'Heatmap' element.

        A 'Heatmap' element is generally defined as a 2d surface distributed into a matrix of discrete sections. Common
            uses include:
            *Reactor core temperature distribution

        A heatmap can implement the following conditions:
            *rect - represents a rectangular matrix of discrete sections dynamically colored (e.g., can visualize
                temperature distribution in a reactor core)

        Args:
            heatmap_id (str): unique id of the heatmap used in conjunction with an svg layout to map the heatmap.
            heatmap_description (str): Description of the what the heatmap physically represents (e.g., a reactor core)
            x_series_len (int): Length of x-series data for simulation (e.g., time series).
            heatmap_report_id (Optional[str]): id representing id of corresponding svg element in svg outline
                provided by the Vis class.
    """

    def __init__(self, heatmap_id, heatmap_description, x_series_len, heatmap_report_id=None):
        super(Heatmap, self).__init__(heatmap_id, heatmap_description, x_series_len, heatmap_report_id)
        self._required_validation.update({
            'rect': {
                'data_3d': lambda a, b, c: validate_array(a, b, 'float', 3, 3, c),
                'color_scale': _validate_color_scale,
                'color_levels': _validate_color_levels
            }
        })

# Wrapper for toggle
class Toggle(Element):
    """Class representing a 'Toggle' element.

        A 'Toggle' element is generally defined as an element that is 'toggled' on and off, up and down, etc. Common
            uses include:
            *Indication of events like fires or pipe breaks

        A toggle can implement the following conditions:
            *show_hide - represents an event that occurs during specific time intervals (e.g., can visualize
                when a fire is occurring in a compartment)

        Args:
            toggle_id (str): unique id of the heatmap used in conjunction with an svg layout to map the heatmap.
            heatmap_description (str): Description of the what the heatmap physically represents (e.g., a reactor core)
            x_series_len (int): Length of x-series data for simulation (e.g., time series).
            heatmap_report_id (Optional[str]): id representing id of corresponding svg element in svg outline
                provided by the Vis class.
    """

    def __init__(self, toggle_id, toggle_description, x_series_len, toggle_report_id=None):
        super(Toggle, self).__init__(toggle_id, toggle_description, x_series_len, toggle_report_id)
        self._required_validation.update({
            'show_hide': {
                'data': _validate_1d_numeric
            }
        })


# Wrapper for report
class Report(Element):
    """Class representing a 'Report' element.

        A 'Report' element is an element that only provides a report output (i.e., only indicates data values)

        Args:
            report_id (str): unique id of the report used in conjunction with an svg layout to map the report.
            report_description (str): Description of the what the report physically represents (e.g., external inputs)
            x_series_len (int): Length of x-series data for simulation (e.g., time series).
    """

    def __init__(self, report_id, report_description, x_series_len):
        super(Report, self).__init__('', report_description, x_series_len, report_id[0])


# Wrapper for table
class Table(Element):
    """Class representing a 'Table' element.

        A 'Table' element is an element that only provides tabular output (i.e., only indicates data values).

        Args:
            table_id (str): unique id of the table used in conjunction with an svg layout to map the table.
            table_description (str): Description of the what the table physically represents (e.g., summary results)
            x_series_len (int): Length of x-series data for simulation (e.g., time series).
            tabular_data (array): Data able to be cast as str by numpy to represent table content
            headers (array): Data able to be cast as str by numpy to represent table headers
    """

    def __init__(self, table_id, table_description, x_series_len, tabular_data, headers):
        super(Table, self).__init__('', table_description, x_series_len, table_id[0])
        self._required_validation.update({
            'tabular-info': {
                'tabular_data': lambda a, b, c: validate_array_slices(a, b, 'str'),
                'headers': lambda a, b, c: validate_array(a, b, 'str', 1, 1, None)
            }
        })

        # Add info and remove ability to add additional conditions to element
        self.add_condition('tabular-info', tabular_data=tabular_data, headers=headers)
        self.add_condition = None


# Wrapper for color scale legend
class ColorScale(Element):
    """Class representing a 'ColorScale' element.

        A 'ColorScale' element is an element that only provides a color scale legend.

        Args:
            color_scale_id (str): unique id of the scale used in conjunction with an svg layout to map the color scale.
            color_scale_desc (str): Description of the what the color scale physically represents
                (e.g., gas temperature)
            x_series_len (int): Length of x-series data for simulation (e.g., time series).
            color_scale (array): Data able to be cast as numeric by numpy to represent color scale
            color_levels (array): Data able to be cast as str by numpy to represent color levels
    """

    def __init__(self, color_scale_id, color_scale_desc, x_series_len, color_scale, color_levels, opacity=1):
        super(ColorScale, self).__init__('', color_scale_desc, x_series_len, color_scale_id[0])
        self._required_validation.update({
            'color-scale': {
                'color_scale': _validate_color_scale,
                'color_levels': _validate_color_levels
            }
        })

        # Add color scale and remove ability to add additional conditions to element
        self.add_condition('color-scale', color_scale=color_scale, color_levels=color_levels, opacity=opacity)
        self.add_condition = None
