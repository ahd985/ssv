import os

import numpy as np

from ssv import SSV


def run():
    # Generate fake cutset data
    cutset_data = [['%LDHR','ACB-A-F','ACB-B-F','RCIC-F','HPCI-F'],
                   ['%ATWS','SLC-F','RHR-F'],
                   ['%LOSP','EDG-A-F','EDG-B-F','RCIC-F','HPCI-F'],
                   ['%LDHR','DCB-A-F','DCB-B-F','LPCI-A-F','LPCI-B-F']]

    be_data = {'%LDHR':['Loss of Decay Heat Removal', 1.0E-2],
                        '%LOSP':['Loss of Offsite Power', 1.0E-3],
                        '%ATWS':['Anticipated Transient Without SCRAM', 1.0E-2],
                        'SLC-F':['Failure of Standby Liquid Coolant',1.0E-3],
                        'ACB-A-F':['Failure of AC Bus A',3.0E-3],
                        'ACB-B-F':['Failure of AC Bus B',3.0E-3],
                        'XFMR-F':['Failure of Main Transformer',2.0E-4],
                        'EDG-A-F':['Failure of Emergency Diesel Generator A',1.0E-4],
                        'EDG-B-F':['Failure of Emergency Diesel Generator B',1.0E-4],
                        'DCB-A-F':['Failure of DC Bus A',2.0E-2],
                        'DCB-B-F':['Failure of DC Bus B',2.0E-2],
                        'RHR-F':['Failure of Residual Heat Removal',1.0E-4],
                        'RCIC-F':['Failure of Reactor Core Isolation Cooling',4.0E-3],
                        'LPCI-A-F':['Failure of Low Pressure Coolant Injection A',5.0E-2],
                        'LPCI-B-F':['Failure of Low Pressure Coolant Injection B',5.0E-2],
                        'HPCI-F':['Failure of High Pressure Cooland Injection',1.0E-3]}

    cutset_freqs = [np.prod([be_data[be][1] for be in cutset]) for cutset in cutset_data]

    be_list = be_data.keys()
    be_map = {be:[True if be in cutset else False for cutset in cutset_data] for be in be_list}
    report = [[[i] + be_data[i] for i in cutset] for cutset in cutset_data]


    # Initiate and hook up SSV model
    ssv_model = SSV.create_vis(cutset_freqs, 'per year', os.path.join('examples', 'example_4', 'example_4.svg'),
                    title="Cutset Visualization", font_size=8)

    # Add tablular data
    table = ssv_model.add_element('table', 'cutset-report', 'Cutset Table')
    table.add_condition("tabularinfo", report, ['Basic Event', 'Description', 'Probability'])

    # Wire up svg elements
    svg_id = ''
    for eq in be_list:
        if "%" in eq:
            svg_id = eq[1:]
        else:
            svg_id = eq[:-2]

        el = ssv_model.add_element('cell', svg_id.lower())
        el.add_condition('logical', data=be_map[eq], true_color='#F44336', false_color='#FFFFFF')

    ssv_model.save_visualization(os.path.join('examples', 'example_4', 'example_4'))

    return True

