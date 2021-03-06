from .type_check import type_check


class Condition:
    """Class representing element condition.

        This class can represent many physical properties of an object (e.g., water level, pressure, temperature).

        Args:
            condition_id (str): Unique id of condition.
            **kwargs: Arbitrary keyword arguments dependant on condition subclass.
    """

    @staticmethod
    def create(cls_name, *args, **kwargs):
        """Class factory method for Condition subclasses.

            Args:
                cls_name (str):Condition subclass.

            Returns:
                Array of Condition subclass(es) of type cls_name.
        """

        for cls in Condition.__subclasses__():
            if cls_name.lower() == cls.__name__.lower():
                return cls(*args, **kwargs)

        # If we get to end of function raise error
        raise ValueError('condition type \'%s\' is not a supported type.' % cls_name)

    @type_check()
    def __init__(self, id='', description='', unit='', opacity=1.0, report=True, overlay='',
                 section_label='Zone', **kwargs):
        self.id = id
        self.type = self.__class__.__name__.lower()
        self.description = description
        self.unit = unit
        self.opacity = opacity
        self.report = report
        self.overlay = overlay
        self.section_label = section_label

    def dump_attr(self):
        return {k: v for k, v in self.__dict__.items() if k[0] != '_'}


# Generic Condition subclasses
class Info(Condition):
    """Class representing "Info" only (no visualization).

        Info is used to display data in a report.

        Args:
            x_len (int): Length of x-series.
            data (array): input data representing input values along x-series
            **kwargs: arbitrary keyword arguments for Condition super class.
    """

    @type_check("data.float.1.2&x_len")
    def __init__(self, x_len, data, **kwargs):
        super(Info, self).__init__(**kwargs)
        self.data = data


# Cell-specific classes
class Background(Condition):
    """Class representing a cell background.

        Represents the background of a cell with a dynamically changing color (e.g., can visualize
            gas temperature in a compartment).

        Args:
            x_len (int): Length of x-series.
            color_data (array): input data representing input values along x-series that map to a color value
            color_scale (array): Data able to be cast as numeric by numpy to represent color scale
            color_levels (array): Data able to be cast as str by numpy to represent color levels
            **kwargs: arbitrary keyword arguments for Condition super class.
    """

    @type_check("color_data.float.1.1&x_len", "color_scale&color_levels")
    def __init__(self, x_len, color_data, color_scale, color_levels, unit_description_prepend='color_data', **kwargs):
        super(Background, self).__init__(**kwargs)
        self.color_data = color_data
        self.color_scale = color_scale
        self.color_levels = color_levels


class StaticLevel(Condition):
    """Class representing a vertical level in a cell with a constant color.

        Represents a changing vertical portion of the cell with a static color (e.g., can visualize
            water level in a tank with a static temperature).

        Args:
            x_len (int): Length of x-series.
            level_data (array): input data representing input values along x-series that map to a level value
            color_scale (array): Data able to be cast as numeric by numpy to represent color scale
            color_levels (array): Data able to be cast as str by numpy to represent color levels
            **kwargs: arbitrary keyword arguments for Condition super class.
    """

    @type_check("level_data.float.1.1&x_len", "min_height&max_height")
    def __init__(self, x_len, level_data, color, min_height, max_height,
                 unit_description_prepend='level_data',**kwargs):
        super(StaticLevel, self).__init__(**kwargs)
        self.level_data = level_data
        self.color = color
        self.min_height = min_height
        self.max_height = max_height


class DynamicLevel(Condition):
    """Class representing a vertical level in a cell with a dynamic color.

        Represents a changing vertical portion of the cell with a dynamic color (e.g., can visualize
            water level in a tank with a changing temperature)

        Args:
            x_len (int): Length of x-series.
            level_data (array): input data representing vertical extent of values along x-series
            color_data (array): input data representing dynamic color values along x-series
            color_scale (array): Data able to be cast as numeric by numpy to represent color scale
            color_levels (array): Data able to be cast as str by numpy to represent color levels
            min_height (int, float): Value representing min cutoff data value for visualization
            max_height (int, float): Value representing max cutoff data value for visualization
            **kwargs: arbitrary keyword arguments for Condition super class.
    """

    @type_check("level_data.float.1.1&x_len", "color_data.float.1.1&x_len", "color_scale&color_levels",
                "min_height&max_height")
    def __init__(self, x_len, level_data, color_data, color_scale, color_levels, min_height, max_height,
                 color_data_description='', color_data_unit='', unit_description_prepend='level_data', **kwargs):
        super(DynamicLevel, self).__init__(**kwargs)
        self.level_data = level_data
        self.color_data = color_data
        self.color_scale = color_scale
        self.color_levels = color_levels
        self.min_height = min_height
        self.max_height = max_height

        if color_data_description != '' or color_data_unit != '':
            self.additional_info = Condition.create('info', x_len, level_data, description=color_data_description,
                                                    unit=color_data_unit).dump_attr()


class Logical(Condition):
    """Class representing a logical color condition in a cell.

        Represents the background of a cell that changes color based on True/False criteria (e.g., can visualize
            pipe opened/closed)

        Args:
            x_len (int): Length of x-series.
            data (array): input data representing true/false values along x-series
            true_color (str): hex color representing "true" state
            false_color (str): hex color representing "false" state
            **kwargs: arbitrary keyword arguments for Condition super class.
    """

    @type_check("data.float.1.1&x_len")
    def __init__(self, x_len, data, true_color, false_color, **kwargs):
        super(Logical, self).__init__(**kwargs)
        self.data = data
        self.true_color = true_color
        self.false_color = false_color


class ZonalY(Condition):
    """Class representing a vertical multi-zonal model.

        Represents a vertical multi-zonal model (e.g., can visualize a two or more gas zones in a
            compartment)

        Args:
            x_len (int): Length of x-series.
            level_data (array): 2d input data representing vertical extent of values along x-series
            color_data (array): 2d input data representing dynamic color values along x-series
            color_scale (array): Data able to be cast as numeric by numpy to represent color scale
            color_levels (array): Data able to be cast as str by numpy to represent color levels
            min_height (int, float): Value representing min cutoff data value for visualization
            max_height (int, float): Value representing max cutoff data value for visualization
            **kwargs: arbitrary keyword arguments for Condition super class.
    """

    @type_check("level_data.float.2.2&x_len", "color_data.float.2.2&x_len", "color_scale&color_levels",
                "min_height&max_height")
    def __init__(self, x_len, level_data, color_data, color_scale, color_levels, min_height, max_height,
                 color_data_description='', color_data_unit='', unit_description_prepend='level_data', **kwargs):
        super(ZonalY, self).__init__(**kwargs)
        self.level_data = level_data
        self.color_data = color_data
        self.color_scale = color_scale
        self.color_levels = color_levels
        self.min_height = min_height
        self.max_height = max_height

        if len(self.level_data[0]) != len(self.color_data[0]):
            raise ValueError("length of data inputs must be equal")

        if color_data_description != '' or color_data_unit != '':
            self.additional_info = Condition.create('info', x_len, level_data, description=color_data_description,
                                                    unit=color_data_unit).dump_attr()


# Line-specific classes
class EqualY(Condition):
    """Class representing equal vertical sections of a line.

        Represents an number of equal-height sections on a path dynamically colored (e.g., can visualize
            temperature distribution in a vessel wall)

        Args:
            x_len (int): Length of x-series.
            color_data (array): 2d input data representing dynamic color values along x-series map
            color_scale (array): Data able to be cast as numeric by numpy to represent color scale
            color_levels (array): Data able to be cast as str by numpy to represent color levels
            **kwargs: arbitrary keyword arguments for Condition super class.
    """

    @type_check("color_data.float.2.2&x_len", "color_scale&color_levels")
    def __init__(self, x_len, color_data, color_scale, color_levels, unit_description_prepend='color_data', **kwargs):
        super(EqualY, self).__init__(**kwargs)
        self.color_data = color_data
        self.color_scale = color_scale
        self.color_levels = color_levels


#Heatmap-specific classes
class Rect(Condition):
    """Class representing a rectangular heatmap.

        Represents a rectangular matrix of discrete sections dynamically colored (e.g., can visualize
            temperature distribution in a reactor core)

        Args:
            x_len (int): Length of x-series.
            color_data (array): 3d input data representing heatmap data slices along x-series that map to a color
            color_scale (array): Data able to be cast as numeric by numpy to represent color scale
            color_levels (array): Data able to be cast as str by numpy to represent color levels
            **kwargs: arbitrary keyword arguments for Condition super class.
    """

    @type_check("color_data.float.3.3&x_len", "color_scale&color_levels")
    def __init__(self, x_len, color_data, color_scale, color_levels, unit_description_prepend='color_data', **kwargs):
        super(Rect, self).__init__(**kwargs)
        self.color_data = color_data
        self.color_scale = color_scale
        self.color_levels = color_levels


#Toggle-specific classes
class ShowHide(Condition):
    """Class representing a show/hide feature.

        Represents an event that occurs during specific time intervals (e.g., can visualize
            when a fire is occurring in a compartment)

        Args:
            x_len (int): Length of x-series.
            data (array): input data representing true/false data along x-series
            **kwargs: arbitrary keyword arguments for Condition super class.
    """

    @type_check("data.float.1.1&x_len")
    def __init__(self, x_len, data, **kwargs):
        super(ShowHide, self).__init__(**kwargs)
        self.data = data


# Table-specific classes
class TabularInfo(Condition):
    """Class representing tabular data output.

        Represents info in a tabular configuration.

        Args:
            x_len (int): Length of x-series.
            tabular_data (array): input representing tabular data
            headers (array): Data able to be cast as str by numpy to represent table headers
            **kwargs: arbitrary keyword arguments for Condition super class.
    """

    @type_check("tabular_data.str&x_len", "headers.str.1.1")
    def __init__(self, x_len, tabular_data, headers, **kwargs):
        super(TabularInfo, self).__init__(**kwargs)
        self.tabular_data = tabular_data
        self.headers = headers


# Legend-specific classes
class ColorScale(Condition):
    """Class representing a color scale.

        Args:
            x_len (int): Length of x-series.
            color_scale (array): Data able to be cast as numeric by numpy to represent color scale
            color_levels (array): Data able to be cast as str by numpy to represent color levels
            **kwargs: arbitrary keyword arguments for Condition super class.
    """

    @type_check("color_scale&color_levels")
    def __init__(self, x_len, color_scale, color_levels, **kwargs):
        self.color_scale = color_scale
        self.color_levels = color_levels
        super(ColorScale, self).__init__(**kwargs)