import inspect
import json

import ssv.elements as elements
import ssv.conditions as conditions
import ssv.type_check as type_check

invalid_args = ["self"]
condition_args = {}
condition_args_base = [a for a in inspect.getargspec(conditions.Condition.__init__).args if a not in invalid_args]
for cls in conditions.Condition.__subclasses__():
    condition_args[cls.__name__] = [a for a in inspect.signature(cls.__init__).parameters][1:] + \
                                   [a for a in cls.__init__.type_args]

element_args = {}
element_args_base = [a for a in inspect.getargspec(elements.Element.__init__).args if a not in invalid_args]
for cls in elements.Element.__subclasses__():
    element_args[cls.__name__] = list(set([a for a in inspect.getargspec(cls.__init__).args if a not in invalid_args] +
                                       element_args_base))

element_conditions = {}
for cls in elements.Element.__subclasses__():
    element_conditions[cls.__name__] = cls._allowed_conditions

element_max_conditions = {}
for cls in elements.Element.__subclasses__():
    element_max_conditions[cls.__name__] = cls._max_conditions

def get_name(o):
    if isinstance(o, tuple):
        return [n.__name__ for n in o]
    else:
        return o.__name__

input_types = {k: get_name(v) for k, v in type_check.input_map.items()}


def gen():
    return json.dumps({
        "condition_args": condition_args,
        "element_args": element_args,
        "element_conditions": element_conditions,
        "element_max_conditions": element_max_conditions,
        "input_types": input_types,
    })

if __name__ == '__main__':
    print(gen())