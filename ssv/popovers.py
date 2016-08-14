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
            self.dims = (150, 50)

        # Check for label
        if 'label' in kwargs:
            if not isinstance(kwargs['label'], str):
                raise TypeError('%s input must be a string' % k)
            self.label = kwargs['label']


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
class SparkLine(Popover):
    """Class representing "" only (no visualization).

        Info is used to display data in a report.

        Args:
            x_series (int, float): X-series data for simulation (e.g., time series).
            data (array): input data representing input values along x-series
            **kwargs: arbitrary keyword arguments for Popover super class.
    """

    def __init__(self, x_series, data, **kwargs):
        super(SparkLine, self).__init__(**kwargs)
        self.x_series = x_series
        self.data = validate_array(data, 'float', 1, 2, len(x_series))