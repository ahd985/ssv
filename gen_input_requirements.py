import inspect
import json

import ssv.elements as elements
import ssv.conditions as conditions
import ssv.type_check as type_check

invalid_args = ["self"]

def get_name(o):
    if isinstance(o, tuple):
        return [n.__name__ for n in o]
    else:
        return o.__name__

input_types = {k: get_name(v) for k, v in type_check.input_map.items()}

condition_args = {}
condition_validation = {}
condition_args_base = [a for a in inspect.signature(conditions.Condition.__init__).parameters if a != 'kwargs'][1:]
default_map = {p.name: (p.default if p.default else None) for p in inspect.signature(conditions.Condition.__init__).parameters.values()}
condition_args_base = {a: {'input_type': (input_types[a] if a in input_types else None), 'default': default_map[a]}
                       for a in condition_args_base}
for cls in conditions.Condition.__subclasses__():
    args = [a for a in inspect.signature(cls.__init__).parameters if a != 'kwargs'][1:]
    args = {a: {'input_type': (input_types[a] if a in input_types else None), 'default': None} for a in args}
    args.update(condition_args_base)
    validators = {a: input_types[a] if a in input_types else None for a in cls.__init__.type_args}
    condition_validation[cls.__name__] = validators
    condition_args[cls.__name__] = args
element_conditions = {}
for cls in elements.Element.__subclasses__():
    element_conditions[cls.__name__] = {c: {"args": condition_args[c],
                                            "validators": condition_validation[c],
                                            "max_conditions": cls._max_conditions}
                                        for c in cls._allowed_conditions}

input_requirements = {}
element_args_base = [a for a in inspect.getargspec(elements.Element.__init__).args if a not in invalid_args]
for cls in elements.Element.__subclasses__():
    input_requirements[cls.__name__] = {}
    args = list(set([a for a in inspect.getargspec(cls.__init__).args
                                                         if a not in invalid_args] + element_args_base))
    args = {a: input_types[a] if a in input_types else None for a in args}
    input_requirements[cls.__name__]["args"] = args
    input_requirements[cls.__name__]["conditions"] = element_conditions[cls.__name__]


def gen():
    return json.dumps(input_requirements).lower()

if __name__ == '__main__':
    print(gen())