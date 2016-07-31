from .data_validators import validate_array

class Popover:
    """Class representing a popover for an element.

        Args:
            **kwargs: arbitrary keyword arguments
    """

    def __init__(self, **kwargs):
        self.type = type(self).__name__.lower()
        if "dims" in kwargs:
            if not validate_array(kwargs["dims"], 1, 1, 2):
                raise ValueError("Input for popover dimensions must be a tuple with two floats")
            self.dims = kwargs["dims"]
        else:
            self.dims = (0.2, 0.2)


    @staticmethod
    def create(cls_name, *args, **kwargs):
        """Class factory method for Condition subclasses.

            Args:
                cls_name (str):Popover subclass.

            Returns:
                Array of Condition subclass(es) of type cls_name.
        """

        for cls in Popover.__subclasses__():
            if cls_name.lower() == cls.__name__.lower():
                return cls(*args, **kwargs)

        # If we get to end of function raise error
        raise ValueError('condition type \'%s\' is not a supported type.' % cls_name)

    def dump_attr(self):
        return {k: v for k, v in self.__dict__.items() if k[0] != '_'}


# Chart Subclasses
class LineChart(Popover):
    """Class representing "" only (no visualization).

        Info is used to display data in a report.

        Args:
            x_len (int): Length of x-series.
            data (array): input data representing input values along x-series
            **kwargs: arbitrary keyword arguments for Popover super class.
    """

    def __init__(self, x_len, data, *args, **kwargs):
        super(LineChart, self).__init__(*args, **kwargs)
        self.data = validate_array(data, 'float', 1, 1, x_len)