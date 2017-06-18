import os

import numpy as np
import scipy.special as special
from ssv import SSV


def run():
    # Let's build assume our core flux distribution takes the form of:
    #   Φ(r,z) = J0(2.405r/R) cos(πz/H)
    #
    #   Where:
    #     r is the radius from the center of the core
    #     z is the height from the bottom of the core
    #     J0 is the bessel function of the first kind, zero order
    #     R is the total radius of the core
    #     H is the total height of the core
    #
    #   Let's also assume the temperature distribution in the core matches this profile.

    # Build profile function for entire core
    def get_temp(rv, zv, peak_temp):
        # Core height and radius, in m
        core_h = 3.7
        core_r = 1.7
        # Assume there is a ratio of core reflector dimensions to active core dimensions
        refl_ratio = 0.5

        temp = peak_temp * ((special.jv(0, 2.405 * rv / core_r * refl_ratio) *
                            np.cos(np.pi * zv / core_h / 2 * refl_ratio)))

        # Reflect r and z axis to build full core
        # Start with r axis
        temp_reflect = np.fliplr(temp[:,:,:])
        temp = np.append(temp_reflect, temp, 1)
        # Flip z axis
        temp_reflect = np.flipud(temp[:,:,:])
        temp = np.append(temp_reflect, temp, 0)

        return temp

    # Raise peak core temperature from 500 K to 800 K over 24 hours
    # Nodalize core into 5 radial regions x 30 axial regions (15 above center and 15 below center)
    # Take data point every 15 minutes
    r = np.linspace(0, 1.7, 5)
    z = np.linspace(0, 3.7/2, 15)
    t = np.linspace(0,24,96)
    rv,zv,tz = np.meshgrid(r,z,t,indexing='ij')

    temp_initial = 500
    temp_final = 800
    peak_temp = temp_initial + (temp_final - temp_initial) * (t / t[-1])
    core_temp = get_temp(rv, zv, peak_temp)

    # Transpose data
    core_temp = core_temp.transpose((2,1,0))

    # Initiate and hook up SSV model
    ssv_model = SSV.create_vis(t, 'hours', os.path.join('examples', 'example_3', 'example_3.svg'),
                    title="Core Heatmap Example", font_size=8)

    core_color_scale = ['#ffffb2','#fecc5c','#fd8d3c','#f03b20','#bd0026']
    core_color_levels = np.linspace(300,800,5)

    node = ssv_model.add_element('heatmap', 'core', 'Core')
    node.add_condition('rect', description='Core Heatmap', unit='K', color_data=core_temp,
                       color_scale=core_color_scale, color_levels=core_color_levels)

    # Use outer vertical rows of heatmap to represent temperature in vessel wall
    walls = ssv_model.add_element('line', ['wall-left', 'wall-right'], 'Vessel Wall')
    walls.add_condition('equaly', description='Vessel Wall Temp', unit='K', color_data=core_temp[:,:,0],
                        color_scale=core_color_scale, color_levels=core_color_levels)

    # Track average and max core temperature
    core_temp_avg = core_temp.mean(axis=2).mean(axis=1)
    core_temp_max = core_temp.max(axis=2).max(axis=1)
    report = ssv_model.add_element('report', 'report-1', 'Core Metrics')
    report.add_condition('info', description='Avg Temp', unit='F', data=core_temp_avg)
    report.add_condition('info', description='Max Temp', unit='F', data=core_temp_max)

    core_temp_legend = ssv_model.add_element('legend', 'core-color-scale', 'Core Temperature (K)')
    core_temp_legend.add_condition("colorscale", core_color_scale, core_color_levels)

    ssv_model.save_visualization(os.path.join('examples', 'example_3', 'example_3'))

    return True

