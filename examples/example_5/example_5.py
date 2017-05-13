import json
import os

from ssv import SSV


def run():
    with open(os.path.join('examples', 'example_5', 'data.json')) as f:
        data = json.load(f)
    ssv_model = SSV.from_json(data)

    ssv_model.save_visualization(os.path.join('examples', 'example_5', 'example_5'))

    return True