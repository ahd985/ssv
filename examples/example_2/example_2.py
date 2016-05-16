import os

import numpy as np
import pandas as pd
from ssv import SSV


def run():
    # Let's use the freely available CFAST code from NIST to generate data
    # http://www.nist.gov/el/fire_research/cfast.cfm
    # This file is from the sample problem provided with the code

    data_f = os.path.join('examples', 'example_2', 'standard_n.csv')
    data = pd.read_csv(data_f, skiprows=[2], header=[0, 1])
    data.columns = [', '.join(col) if i > 0 else col[0] for i, col in enumerate(data.columns)]

    # Initiate and hook up SSV model
    ssv_model = SSV.create_vis(data['Time'], 'seconds', os.path.join('examples', 'example_2', 'example_2.svg'),
                    title="CFAST Example", font_size=10)

    gas_color_scale = ['#fd8d3c','#fc4e2a','#e31a1c','#bd0026','#800026']
    gas_color_levels = np.linspace(min(data['Upper Layer Temperature, Comp 2']),
                                   max(data['Upper Layer Temperature, Comp 3']), 5)

    # Add nodes
    for i in range(1,4):
        data['Layer Height Upper, Comp %d' % i] = 3.0
        node = ssv_model.add_element('cell', 'node-%d' % i, 'Node %d' % i, cell_report_id='node-%d-report' % i)
        node.add_condition('zonal_y', description='Zone Heights', unit='m',
                           data_2d=data[['Layer Height, Comp %d' % i, 'Layer Height Upper, Comp %d' % i]],
                           data_dynamic_2d=data[
                               ['Lower Layer Temperature, Comp %d' % i,
                                'Upper Layer Temperature, Comp %d' % i]],
                           color_scale=gas_color_scale,
                           color_levels=gas_color_levels,
                           max_height=3, description_dynamic='Zone Temperatures', unit_dynamic='C',
                           min_height=0, section_label='Zone')
        node.add_condition('info', data=data[['Pressure, Comp %d' % i]], description='Pressure', unit='Pa')

        if i == 1:
            node.add_condition('info', data=data[['HRR, bunsen']], description='HRR', unit='W')
        elif i == 2:
            node.add_condition('info', data=data[['HRR, Wood_Wall']], description='HRR', unit='W')

    # Add fires
    fire_1 = ssv_model.add_element('toggle', 'fire-1', 'Fire 1')
    fire_1.add_condition('show_hide', data=data['HRR, bunsen'])
    fire_2 = ssv_model.add_element('toggle', 'fire-2', 'Fire 2')
    fire_2.add_condition('show_hide', data=data['HRR, Wood_Wall'])

    # Show gas color scale
    ssv_model.add_element('colorscale', 'color-scale', 'Gas Temperature (C)',
                          color_scale=gas_color_scale,
                          color_levels=gas_color_levels)

    ssv_model.save_visualization(os.path.join('examples', 'example_2', 'example_2'))

    return True

