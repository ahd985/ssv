import inspect

import ssv.elements as elements
import ssv.conditions as conditions

invalid_args = ["self", "id", "x_len"]
condition_args = {}
condition_args_base = [a for a in inspect.getargspec(conditions.Condition.__init__).args if a not in invalid_args]
for cls in conditions.Condition.__subclasses__():
    condition_args[cls.__name__] = set([a for a in inspect.getargspec(cls.__init__).args if a not in invalid_args] +
                                       condition_args_base)

element_args = {}
element_args_base = [a for a in inspect.getargspec(elements.Element.__init__).args if a not in invalid_args]
for cls in elements.Element.__subclasses__():
    element_args[cls.__name__] = set([a for a in inspect.getargspec(cls.__init__).args if a not in invalid_args] +
                                       element_args_base)

element_conditions = {}
for cls in elements.Element.__subclasses__():
    element_conditions[cls.__name__] = cls._allowed_conditions

print(condition_args)
print(element_args)
print(element_conditions)