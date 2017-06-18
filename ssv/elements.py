from .conditions import Condition
from .popovers import Popover
from .type_check import type_check


class Element:
    """Class representing visualization element.

        This class can represent many real world simulation objects (e.g., vessels, pipes, etc).  Note that
            elements can include "reports" that indicate certain values of the visualization data (e.g., physical
            quantities representing by the cell like pressure and temperature).

        Args:
            ids (list[str], str): String id(s) representing the id(s) of the corresponding svg element in the
                svg layout provided by the Vis class.
            element_description (Optional[str]): Description of the visualization element intended representation (e.g.,
                physical objects like 'Reactor Vessel' and 'Steam Pipe').
            x_series (int, float): X-series data for simulation (e.g., time series).
            report_id (str): id representing id of corresponding svg element in svg outline provided by
                the Vis class.

        Attributes:
            conditions (list): List of element conditions (see Condition class)
    """

    _allowed_conditions = []
    _max_conditions = -1

    @type_check()
    def __init__(self, ids, description, x_series, report_id=''):
        self.type = type(self).__name__.lower()
        self.ids = ids
        self.description = description
        self.x_series = x_series
        self.report_id = report_id
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
        condition = Condition.create(condition_cls, len(self.x_series), *args, id=condition_id, **kwargs)

        # If "additional_info" exists as attr, add it as separate "Info" Condition
        if hasattr(condition, 'additional_info'):
            info = Condition.create('info', len(self.x_series),
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
        self.popover = Popover.create(cls_name, self.x_series, data, *args, **kwargs)

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
            id (str): unique id of the cell used in conjunction with an svg layout to map the cell.
            description (str): Description of the what the cell physically represents (e.g., a reactor vessel)
            x_series (int, float): X-series data for simulation (e.g., time series).
    """

    _allowed_conditions = ['Background', 'StaticLevel', 'DynamicLevel', 'ZonalY']

    def __init__(self, id, description, x_series, **kwargs):
        super(Cell, self).__init__(id, description, x_series, **kwargs)

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
                kwargs_dynamic['data'] = kwargs['color_data']
            elif kwargs['type'] == 'zonal_y':
                kwargs_dynamic['data'] = kwargs['color_data']

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
            id (str): unique id of the line used in conjunction with an svg layout to map the line.
            description (str): Description of the what the line physically represents (e.g., a vessel wall)
            x_series (int, float): X-series data for simulation (e.g., time series).
    """

    _allowed_conditions = ['EqualY']
    _max_conditions = 1

    def __init__(self, line_id, line_description, x_series, **kwargs):
        super(Line, self).__init__(line_id, line_description, x_series, **kwargs)


# Wrapper for heatmap
class Heatmap(Element):
    """Class representing a 'Heatmap' element.

        A 'Heatmap' element is generally defined as a 2d surface distributed into a matrix of discrete sections. Common
            uses include:
            *Reactor core temperature distribution

        A heatmap can implement the following conditions:
            *Rect

        Args:
            id (str): unique id of the heatmap used in conjunction with an svg layout to map the heatmap.
            description (str): Description of the what the heatmap physically represents (e.g., a reactor core)
            x_series (int, float): X-series data for simulation (e.g., time series).
    """

    _allowed_conditions = ['Rect']
    _max_conditions = 1

    def __init__(self, id, description, x_series, **kwargs):
        super(Heatmap, self).__init__(id, description, x_series, **kwargs)


# Wrapper for toggle
class Toggle(Element):
    """Class representing a 'Toggle' element.

        A 'Toggle' element is generally defined as an element that is 'toggled' on and off, up and down, etc. Common
            uses include:
            *Indication of events like fires or pipe breaks

        A toggle can implement the following conditions:
            *show_hide

        Args:
            id (str): unique id of the toggle used in conjunction with an svg layout to map the toggle.
            description (str): Description of the what the heatmap physically represents (e.g., an indicator)
            x_series (int, float): X-series data for simulation (e.g., time series).
    """

    _allowed_conditions = ['ShowHide', 'Logical']
    _max_conditions = 1

    def __init__(self, id, description, x_series, **kwargs):
        super(Toggle, self).__init__(id, description, x_series, **kwargs)


# Wrapper for report
class Report(Element):
    """Class representing a 'Report' element.

        A 'Report' element is an element that only provides a report output (i.e., only indicates data values).  This
            class can only implement an "Info" condition.

        Args:
            id (str): unique id of the report used in conjunction with an svg layout to map the report.
            description (str): Description of the what the report physically represents (e.g., external inputs)
            x_series (int, float): X-series data for simulation (e.g., time series).
    """

    _allowed_conditions = ['Info']

    def __init__(self, id, description, x_series, **kwargs):
        super(Report, self).__init__('', description, x_series, id[0])


# Wrapper for table
class Table(Element):
    """Class representing a 'Table' element.

        A 'Table' element is an element that only provides tabular output (i.e., only indicates data values).

        Args:
            id (str): unique id of the table used in conjunction with an svg layout to map the table.
            description (str): Description of the what the table physically represents (e.g., summary results)
            x_series (int, float): X-series data for simulation (e.g., time series).
            tabular_data (array): Data able to be cast as str by numpy to represent table content
            headers (array): Data able to be cast as str by numpy to represent table headers
    """

    _allowed_conditions = ['TabularInfo']
    _max_conditions = 1

    def __init__(self, id, description, x_series, **kwargs):
        super(Table, self).__init__('', description, x_series, id[0], **kwargs)


# Wrapper for legend
class Legend(Element):
    """Class representing a 'Legend' element.

        A 'Legend' element is an element that only provides a color scale.

        Args:
            id (str): unique id of the scale used in conjunction with an svg layout to map the color scale.
            desc (str): Description of the what the color scale physically represents (e.g., gas temperature)
            x_series (int, float): X-series data for simulation (e.g., time series).
            color_scale (array): Data able to be cast as numeric by numpy to represent color scale
            color_levels (array): Data able to be cast as str by numpy to represent color levels
    """

    _allowed_conditions = ['ColorScale']
    _max_conditions = 1

    def __init__(self, id, desc, x_series, **kwargs):
        super(Legend, self).__init__('', desc, x_series, id[0], **kwargs)
