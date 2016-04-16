import os

import numpy as np
import pandas as pd
from ssv.ssv import SSV


def run():
    # Let's use the freely available CFAST code from NIST to generate data
    # http://www.nist.gov/el/fire_research/cfast.cfm
    # This file is from the sample problem provided with the code

    data_f = os.path.join('examples', 'example_2', 'standard_n.csv')

    # First lets capture column information
    variables = []
    compartments = []
    units = []

    with open(data_f) as f:
        for i,line in enumerate(f):
            if i == 0:
                variables = line.split(",")
            elif i == 1:
                compartments = line.split(",")
            elif i == 2:
                units = line.split(",")
                break

    data = pd.read_csv(data_f, skiprows=[1,2])

    # Initiate and hook up SSV model
    ssv_model = SSV(data['Time'], 'seconds', os.path.join('examples', 'example_2', 'example_2.svg'),
                        title="CFAST Example", font_size=6)

    gas_color_scale = ['#fd8d3c','#fc4e2a','#e31a1c','#bd0026','#800026']
    gas_color_levels = np.linspace(min(data['Upper Layer Temperature.2']),
                                                max(data['Upper Layer Temperature.1']), 5).tolist()

    node = ssv_model.add_element('cell', 'node-1', 'Fire Zones', cell_report_id='node-1-report')
    node.add_condition('level_dynamic', description='Zone Interface Level', unit='m', data=data['Layer Height'],
                       data_dynamic=data['Lower Layer Temperature.1'].tolist(), color_scale=gas_color_scale,
                       color_levels=gas_color_levels,
                       max_height=3, description_dynamic='Lower Zone Temp', unit_dynamic='C',
                       min_height=0)

    node.add_condition('background', description='Upper Zone Temp', unit='C', data=data['Upper Layer Temperature.1'],
                       color_scale=gas_color_scale,
                       color_levels=gas_color_levels)


    # Add zonal model
    data['Upper Height'] = 3
    data['Mid Height'] = (3 + data['Layer Height']) / 2
    data['Mid Temp'] = (data['Lower Layer Temperature.1'] + data['Upper Layer Temperature.1']) / 2

    node_2 = ssv_model.add_element('cell', 'node-2', 'Fire Zone', cell_report_id='node-2-report')
    node_2.add_condition('zonal_y', description='Zone Heights', unit='m', data=data[['Layer Height', 'Mid Height', 'Upper Height']].values.tolist(),
                       data_dynamic=data[['Lower Layer Temperature.1','Mid Temp', 'Upper Layer Temperature.1']].values.tolist(), color_scale=gas_color_scale,
                       color_levels=gas_color_levels,
                       max_height=3, description_dynamic='Zone Temperatures', unit_dynamic='C',
                       min_height=0, section_label='Zone')
    node_2.add_condition('info', data=data[['Pressure','Pressure.1','Pressure.2']], description='Pressure', unit='Pa',
                         section_label='Zone')

    report = ssv_model.add_element('report', 'all-report')

    ssv_model.show_color_scale(gas_color_scale, gas_color_levels, "Gas Temperature (F)", "color-scale")

    ssv_model.save_visualization(os.path.join('examples', 'example_2', 'example_2'))

    return True

