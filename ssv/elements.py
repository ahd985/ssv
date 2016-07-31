from .data_validators import validate_array, validate_colors, validate_array_slices, validate_color
from .conditions import Condition
from .popovers import Popover

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

    _allowed_conditions = []

    def __init__(self, element_ids, element_description, x_series_len, element_report_id):
        self.type = type(self).__name__.lower()
        self.ids = element_ids
        if not isinstance(element_description, str):
            raise TypeError('\'element_description\' must be a string.')
        self.description = element_description
        if not element_report_id is None and not isinstance(element_report_id, str):
            raise TypeError('\'element_report_id\' for \'%s\' must be a string.' % element_description)
        self.x_series_len = x_series_len
        self.report_id = element_report_id
        self._max_conditions = -1
        self.conditions = []
        self.popover = None

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

    def add_condition(self, condition_cls, *args, **kwargs):
        """Method to add visualization condition to internal class property.

        Args:
            condition_cls (str): Class of condition to add to element.
            *args: Arbitrary positional arguments for Condition base class
            **kwargs: Arbitrary keyword arguments dependant on condition_type.

        Returns:
            New element condition of condition_type.
        """

        if not isinstance(condition_cls, str):
            raise TypeError("condition_type must be of type str")

        condition_id = '%s_%d' % ('_'.join(self.ids), len(self.conditions))
        condition = Condition.create(condition_cls, self.x_series_len, *args, id=condition_id, **kwargs)

        # If "additional_info" exists as attr, add it as separate "Info" Condition
        if hasattr(condition, 'additional_info'):
            info = Condition.create('info', self.x_series_len,
                                    condition.additional_info['data'],
                                    description=condition.additional_info['description'],
                                    unit=condition.additional_info['unit'],
                                    id=condition_id)
            self.conditions.append(info)

        if len(self.conditions) > self._max_conditions > 0:
            self.conditions.insert(-1, condition)
        else:
            self.conditions.append(condition)

    def add_popover(self, cls_name, data, *args, **kwargs):
        self.popover = Popover.create(cls_name, self.x_series_len, data, *args, **kwargs)

    def dump_attr(self):
        return {k: ([c.dump_attr() for c in v] if k == 'conditions' else
                    v.dump_attr() if hasattr(v, "dump_attr") else v) for
                    k, v in self.__dict__.items() if k[0] != '_'}


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
            *StaticLevel
            *DynamicLevel
            *Background
            *Logical
            *ZonalY

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

    _allowed_conditions = ['Info', 'Background', 'StaticLevel', 'DynamicLevel', 'Logical', 'ZonalY']

    def __init__(self, cell_id, cell_description, x_series_len, cell_report_id=None):
        super(Cell, self).__init__(cell_id, cell_description, x_series_len, cell_report_id)

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
            *EqualY

        Args:
            line_id (str): unique id of the line used in conjunction with an svg layout to map the line.
            line_description (str): Description of the what the line physically represents (e.g., a vessel wall)
            x_series_len (int): Length of x-series data for simulation (e.g., time series).
            line_report_id (Optional[str]): id representing id of corresponding svg element in svg outline
                provided by the Vis class.
    """

    _allowed_conditions = ['EqualY']

    def __init__(self, line_id, line_description, x_series_len, line_report_id=None):
        super(Line, self).__init__(line_id, line_description, x_series_len, line_report_id)

        self._max_conditions = 1


# Wrapper for heatmap
class Heatmap(Element):
    """Class representing a 'Heatmap' element.

        A 'Heatmap' element is generally defined as a 2d surface distributed into a matrix of discrete sections. Common
            uses include:
            *Reactor core temperature distribution

        A heatmap can implement the following conditions:
            *Rect

        Args:
            heatmap_id (str): unique id of the heatmap used in conjunction with an svg layout to map the heatmap.
            heatmap_description (str): Description of the what the heatmap physically represents (e.g., a reactor core)
            x_series_len (int): Length of x-series data for simulation (e.g., time series).
            heatmap_report_id (Optional[str]): id representing id of corresponding svg element in svg outline
                provided by the Vis class.
    """

    _allowed_conditions = ['Rect']

    def __init__(self, heatmap_id, heatmap_description, x_series_len, heatmap_report_id=None):
        super(Heatmap, self).__init__(heatmap_id, heatmap_description, x_series_len, heatmap_report_id)

        self._max_conditions = 1

# Wrapper for toggle
class Toggle(Element):
    """Class representing a 'Toggle' element.

        A 'Toggle' element is generally defined as an element that is 'toggled' on and off, up and down, etc. Common
            uses include:
            *Indication of events like fires or pipe breaks

        A toggle can implement the following conditions:
            *show_hide

        Args:
            toggle_id (str): unique id of the heatmap used in conjunction with an svg layout to map the heatmap.
            heatmap_description (str): Description of the what the heatmap physically represents (e.g., a reactor core)
            x_series_len (int): Length of x-series data for simulation (e.g., time series).
            heatmap_report_id (Optional[str]): id representing id of corresponding svg element in svg outline
                provided by the Vis class.
    """

    _allowed_conditions = ['Info', 'ShowHide']

    def __init__(self, toggle_id, toggle_description, x_series_len, toggle_report_id=None):
        super(Toggle, self).__init__(toggle_id, toggle_description, x_series_len, toggle_report_id)

        self._max_conditions = 1


# Wrapper for report
class Report(Element):
    """Class representing a 'Report' element.

        A 'Report' element is an element that only provides a report output (i.e., only indicates data values).  This
            class can only implement an "Info" condition.

        Args:
            report_id (str): unique id of the report used in conjunction with an svg layout to map the report.
            report_description (str): Description of the what the report physically represents (e.g., external inputs)
            x_series_len (int): Length of x-series data for simulation (e.g., time series).
    """

    _allowed_conditions = ['Info']

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

    _allowed_conditions = ['TabularInfo']

    def __init__(self, table_id, table_description, x_series_len, tabular_data, headers):
        super(Table, self).__init__('', table_description, x_series_len, table_id[0])

        # Add info and remove ability to add additional conditions to element
        self.add_condition('TabularInfo', data=tabular_data, headers=headers)
        self.add_condition = None


# Wrapper for legend
class Legend(Element):
    """Class representing a 'Legend' element.

        A 'Legend' element is an element that only provides a color scale.

        Args:
            color_scale_id (str): unique id of the scale used in conjunction with an svg layout to map the color scale.
            color_scale_desc (str): Description of the what the color scale physically represents
                (e.g., gas temperature)
            x_series_len (int): Length of x-series data for simulation (e.g., time series).
            color_scale (array): Data able to be cast as numeric by numpy to represent color scale
            color_levels (array): Data able to be cast as str by numpy to represent color levels
    """

    def __init__(self, color_scale_id, color_scale_desc, x_series_len, color_scale, color_levels, opacity=1):
        super(Legend, self).__init__('', color_scale_desc, x_series_len, color_scale_id[0])

        # Add color scale and remove ability to add additional conditions to element
        self.add_condition('ColorScale', color_scale=color_scale, color_levels=color_levels, opacity=opacity)
        self.add_condition = None
