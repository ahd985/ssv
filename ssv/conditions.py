from .data_validators import validate_array, validate_colors, validate_array_slices, validate_color, validate_heights


# Common validators
def _validate_color_scale(arr): return validate_array(arr, 'str', 1, 1) if validate_colors(arr) else None
def _validate_color_levels(arr): return validate_array(arr, 'float', 1, 1)
def _validate_1d_numeric(arr, arr_len): return validate_array(arr, 'float', 1, 1, arr_len)


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

    def __init__(self, id='', description='', unit='', opacity=1.0, report=True, overlay=None, section_label='Zone'):
        if not isinstance(description, str):
            raise TypeError("description must be of type str")
        if not isinstance(unit, str):
            raise TypeError("unit must be of type str")
        if not isinstance(opacity, (int, float)):
            raise TypeError("opacity must be a float or an int")
        if not isinstance(report, bool):
            raise TypeError("report must be of type boolean")
        if overlay is not None and not isinstance(overlay, str):
            raise TypeError("overlay must be of type str")
        if not isinstance(section_label, str):
            raise TypeError("section_label must be of type str")

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

    def __init__(self, x_len, data, **kwargs):
        super(Info, self).__init__(**kwargs)
        self.data = validate_array(data, 'float', 1, 2, x_len)


# Cell-specific classes
class Background(Condition):
    """Class representing a cell background.

        Represents the background of a cell with a dynamically changing color (e.g., can visualize
            gas temperature in a compartment).

        Args:
            x_len (int): Length of x-series.
            data (array): input data representing input values along x-series
            color_scale (array): Data able to be cast as numeric by numpy to represent color scale
            color_levels (array): Data able to be cast as str by numpy to represent color levels
            **kwargs: arbitrary keyword arguments for Condition super class.
    """

    def __init__(self, x_len, data, color_scale, color_levels, **kwargs):
        super(Background, self).__init__(**kwargs)
        self.data = _validate_1d_numeric(data, x_len)
        self.color_scale = _validate_color_scale(color_scale)
        self.color_levels = _validate_color_levels(color_levels)


class StaticLevel(Condition):
    """Class representing a vertical level in a cell with a constant color.

        Represents a changing vertical portion of the cell with a static color (e.g., can visualize
            water level in a tank with a static temperature).

        Args:
            x_len (int): Length of x-series.
            data (array): input data representing input values along x-series
            color_scale (array): Data able to be cast as numeric by numpy to represent color scale
            color_levels (array): Data able to be cast as str by numpy to represent color levels
            **kwargs: arbitrary keyword arguments for Condition super class.
    """

    def __init__(self, x_len, data, color_scale, color_levels, min_height, max_height, **kwargs):
        super(StaticLevel, self).__init__(**kwargs)
        self.data = _validate_1d_numeric(data, x_len)
        self.color_scale = _validate_color_scale(color_scale)
        self.color_levels = _validate_color_levels(color_levels)
        self.min_height, self.max_height = validate_heights(min_height, max_height)


class DynamicLevel(Condition):
    """Class representing a vertical level in a cell with a dynamic color.

        Represents a changing vertical portion of the cell with a dynamic color (e.g., can visualize
            water level in a tank with a changing temperature)

        Args:
            x_len (int): Length of x-series.
            data (array): input data representing vertical extent of values along x-series
            data_dynamic (array): input data representing dynamic color values along x-series
            color_scale (array): Data able to be cast as numeric by numpy to represent color scale
            color_levels (array): Data able to be cast as str by numpy to represent color levels
            min_height (int, float): Value representing min cutoff data value for visualization
            max_height (int, float): Value representing max cutoff data value for visualization
            **kwargs: arbitrary keyword arguments for Condition super class.
    """

    def __init__(self, x_len, data, data_dynamic, color_scale, color_levels, min_height, max_height,
                 description_dynamic='', unit_dynamic='', **kwargs):
        super(DynamicLevel, self).__init__(**kwargs)
        self.data = _validate_1d_numeric(data, x_len)
        self.data_dynamic = _validate_1d_numeric(data_dynamic, x_len)
        self.color_scale = _validate_color_scale(color_scale)
        self.color_levels = _validate_color_levels(color_levels)
        self.min_height, self.max_height = validate_heights(min_height, max_height)

        if description_dynamic != '' or unit_dynamic != '':
            self.additional_info = Condition.create('info', x_len, data_dynamic, description=description_dynamic,
                                                    unit=unit_dynamic).dump_attr()


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

    def __init__(self, x_len, data, true_color, false_color, **kwargs):
        super(Logical, self).__init__(**kwargs)
        self.data = _validate_1d_numeric(data, x_len)
        self.true_color = validate_color(true_color)
        self.false_color = validate_color(false_color)


class ZonalY(Condition):
    """Class representing a vertical multi-zonal model.

        Represents a vertical multi-zonal model (e.g., can visualize a two or more gas zones in a
            compartment)

        Args:
            x_len (int): Length of x-series.
            data (array): 2d input data representing vertical extent of values along x-series
            data_dynamic (array): 2d input data representing dynamic color values along x-series
            color_scale (array): Data able to be cast as numeric by numpy to represent color scale
            color_levels (array): Data able to be cast as str by numpy to represent color levels
            min_height (int, float): Value representing min cutoff data value for visualization
            max_height (int, float): Value representing max cutoff data value for visualization
            **kwargs: arbitrary keyword arguments for Condition super class.
    """

    def __init__(self, x_len, data, data_dynamic, color_scale, color_levels, min_height, max_height,
                 description_dynamic='', unit_dynamic='', **kwargs):
        super(ZonalY, self).__init__(**kwargs)
        self.data = validate_array(data, 'float', 2, 2, x_len)
        self.data_dynamic = validate_array(data_dynamic, 'float', 2, 2, x_len)
        self.color_scale = _validate_color_scale(color_scale)
        self.color_levels = _validate_color_levels(color_levels)
        self.min_height, self.max_height = validate_heights(min_height, max_height)

        if len(self.data[0]) != len(self.data_dynamic[0]):
            raise ValueError("length of data inputs must be equal")

        if description_dynamic != '' or unit_dynamic != '':
            self.additional_info = Condition.create('info', x_len, data_dynamic, description=description_dynamic,
                                                    unit=unit_dynamic).dump_attr()


# Line-specific classes
class EqualY(Condition):
    """Class representing equal vertical sections of a line.

        Represents an number of equal-height sections on a path dynamically colored (e.g., can visualize
            temperature distribution in a vessel wall)

        Args:
            x_len (int): Length of x-series.
            data (array): 2d input data representing dynamic color values along x-series
            color_scale (array): Data able to be cast as numeric by numpy to represent color scale
            color_levels (array): Data able to be cast as str by numpy to represent color levels
            **kwargs: arbitrary keyword arguments for Condition super class.
    """

    def __init__(self, x_len, data, color_scale, color_levels, **kwargs):
        super(EqualY, self).__init__(**kwargs)
        self.data = validate_array(data, 'float', 2, 2, x_len)
        self.color_scale = _validate_color_scale(color_scale)
        self.color_levels = _validate_color_levels(color_levels)


#Heatmap-specific classes
class Rect(Condition):
    """Class representing a rectangular heatmap.

        Represents a rectangular matrix of discrete sections dynamically colored (e.g., can visualize
            temperature distribution in a reactor core)

        Args:
            x_len (int): Length of x-series.
            data (array): 3d input data representing heatmap data slices along x-series
            color_scale (array): Data able to be cast as numeric by numpy to represent color scale
            color_levels (array): Data able to be cast as str by numpy to represent color levels
            **kwargs: arbitrary keyword arguments for Condition super class.
    """

    def __init__(self, x_len, data, color_scale, color_levels, **kwargs):
        super(Rect, self).__init__(**kwargs)
        self.data = validate_array(data, 'float', 3, 3, x_len)
        self.color_scale = _validate_color_scale(color_scale)
        self.color_levels = _validate_color_levels(color_levels)


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

    def __init__(self, x_len, data, **kwargs):
        super(ShowHide, self).__init__(**kwargs)
        self.data = _validate_1d_numeric(data, x_len)


# Table-specific classes
class TabularInfo(Condition):
    """Class representing tabular data output.

        Represents info in a tabular configuration.

        Args:
            x_len (int): Length of x-series.
            data (array): input representing tabular data
            data (array): Data able to be cast as str by numpy to represent table content
            headers (array): Data able to be cast as str by numpy to represent table headers
            **kwargs: arbitrary keyword arguments for Condition super class.
    """

    def __init__(self, x_len, data, headers, **kwargs):
        super(TabularInfo, self).__init__(**kwargs)
        self.tabular_data = validate_array_slices(data, 'str', x_len),
        self.headers = validate_array(headers, 'str', 1, 1, x_len)


# Table-specific classes
class TabularInfo(Condition):
    """Class representing tabular data output.

        Represents info in a tabular configuration.

        Args:
            x_len (int): Length of x-series.
            data (array): input representing tabular data
            data (array): Data able to be cast as str by numpy to represent table content
            headers (array): Data able to be cast as str by numpy to represent table headers
            **kwargs: arbitrary keyword arguments for Condition super class.
    """

    def __init__(self, x_len, data, headers, **kwargs):
        super(TabularInfo, self).__init__(**kwargs)
        self.data = validate_array_slices(data, 'str', x_len)
        self.headers = validate_array(headers, 'str', 1, 1)


# Legend-specific classes
class ColorScale(Condition):
    """Class representing a color scale.

        Args:
            x_len (int): Length of x-series.
            color_scale (array): Data able to be cast as numeric by numpy to represent color scale
            color_levels (array): Data able to be cast as str by numpy to represent color levels
            **kwargs: arbitrary keyword arguments for Condition super class.
    """

    def __init__(self, x_len, color_scale, color_levels, **kwargs):
        super(ColorScale, self).__init__(**kwargs)
        self.color_scale = _validate_color_scale(color_scale)
        self.color_levels = _validate_color_levels(color_levels)