import os

import numpy as np
import pandas as pd
from scipy.interpolate import interp1d

from ssv import SSV


def run():
    # Load steam tables and build interpolation functions for several features
    sat_tables = pd.read_excel(os.path.join('examples', 'example_1', 'steam_tables.xls'))
    f_press = interp1d(sat_tables['vg'], sat_tables['Mpa'])
    f_temp = interp1d(sat_tables['vg'], sat_tables['deg C'])
    f_wtr_sp_vol = interp1d(sat_tables['vg'], sat_tables['vf'])
    f_wtr_enthalpy = interp1d(sat_tables['vg'], sat_tables['hf'])
    f_vap_enthalpy = interp1d(sat_tables['vg'], sat_tables['hg'])
    f_lat_heat = interp1d(sat_tables['vg'], sat_tables['hfg'])

    # Function to get properties of saturated water+vapor given vapor density
    def get_props_from_vap_density(density):
        props_out = {}

        sp_vol = 1 / density
        props_out['press'] = float(f_press(sp_vol))
        props_out['temp'] = float(f_temp(sp_vol) + 273.15)
        props_out['wtr_density'] = float(1 / f_wtr_sp_vol(sp_vol))
        props_out['wtr_enthalpy'] = float(f_wtr_enthalpy(sp_vol))
        props_out['vap_enthalpy'] = float(f_vap_enthalpy(sp_vol))
        props_out['lat_heat'] = float(f_lat_heat(sp_vol))

        return props_out

    def th_run(initial_wtr_mass, initial_wtr_level,
               downstream_height, steam_flow, discharge_press, time_step, end_time):
        """
            Simple Thermal-Hydraulic analysis code for water between 2 compartments.
            Assume downstream is water/steam compartment always at saturated conditions.
            Assume upstream is saturated steam environment that discharges to downstream.
            Heat loss to environment and Condensation is assumed to be negligible.  Inputs:

                initial_wtr_mass = initial downstream water mass in kg.
                initial_wtr_level = initial downstream water level in m.  Note that
                    the downstream volume is assumed to increase linearly with height
                    based on this input.
                downstream_height = total height of downstream compartment (m)
                steam_flow = 4 x n array of n occurences of upstream to downstream steam flow.
                    Row 1 is start time of flow in S
                    Row 2 is end time of flow in S
                    Row 3 is specific enthalpy of flow in kJ/kg
                    Row 4 is total mass of flow in kg
                discharge_press = pressure control point of downstream compartment in MPa.
                    Downstream compartment is modeled as instantly opening and relieving
                    conditions down to atmospheric over a single time step.
                time_step = time step of analysis in S.
                end_time = analysis end time is S.

            Returns downstream pressure, temperature, water level, and logical states
            of relief valve and steam discharge as a function of time.
        """

        # Assign initial conditions
        vap_density = 0.59
        wtr_mass = initial_wtr_mass
        wtr_lvl = initial_wtr_level
        wtr_lvl_vol_slope = wtr_lvl / wtr_mass

        # Determine downstream conditions using steam tables - assume saturated conditions
        props = get_props_from_vap_density(vap_density)
        press = props['press']
        temp = props['temp']
        wtr_enthalpy = props['wtr_enthalpy']
        wtr_density = props['wtr_density']
        vap_enthalpy = props['vap_enthalpy']
        lat_heat = props['lat_heat']

        wtr_vol = wtr_mass / wtr_density
        total_vol = wtr_vol * downstream_height / wtr_lvl
        vap_vol = total_vol - wtr_vol
        vap_mass = vap_density * vap_vol
        lvl_vol_slope = wtr_lvl / wtr_vol

        # Cast steam_flow as numpy array
        steam_flow = np.array(steam_flow)

        # Flag for relief valve
        rv_flag = False

        # Record conditons at t=0
        conditions_out = {'press':[press], 'temp':[temp], 'wtr_lvl':[wtr_lvl],
                          'rv':[rv_flag], 'disch':[False], 'time':[0]}

        # Run through time span, calculating conditions at each step
        for t in np.arange(1, end_time+time_step, time_step):
            # Check if current time span is within or includes any steam_flow entry
            # and calculate integrated enthalpy addition
            time_mask = ((steam_flow[0] >= t) & (steam_flow[0] < t + time_step)) | ((steam_flow[0] < t) & (steam_flow[1] > t))
            start_times = steam_flow[0][time_mask]
            start_times[start_times < t] = t
            end_times = steam_flow[1][time_mask]
            end_times[end_times > t + time_step] = t + time_step
            time_deltas = end_times - start_times
            upstream_enthalpy = steam_flow[2][time_mask]
            flow_mass = steam_flow[3][time_mask] * time_deltas

            # Calculate vaporized water mass
            excess_enthalpy = (upstream_enthalpy - wtr_enthalpy) * flow_mass
            vaporized_wtr_mass = (excess_enthalpy / lat_heat).sum()

            # Update water mass and vapor mass and density
            wtr_mass += flow_mass.sum() - vaporized_wtr_mass
            vap_mass += vaporized_wtr_mass
            vap_density = vap_mass / (total_vol * (1 - wtr_vol/total_vol))

            # If we are at relief pressure reset to saturated conditions and calculate
            # change in water mass
            if press > discharge_press:
                vap_density = 0.59
                props = get_props_from_vap_density(vap_density)
                wtr_enthalpy_new = props['wtr_enthalpy']
                lat_heat = props['lat_heat']
                wtr_mass -= (wtr_enthalpy - wtr_enthalpy_new) * wtr_mass / lat_heat
                rv_flag = True
            else:
                rv_flag = False

            # Calculate new properties
            # Assume water density has negligible change between time steps
            props = get_props_from_vap_density(vap_density)
            press = props['press']
            temp = props['temp']
            wtr_density = props['wtr_density']
            wtr_enthalpy = props['wtr_enthalpy']
            lat_heat = props['lat_heat']
            wtr_lvl = lvl_vol_slope * wtr_mass / wtr_density
            vap_mass = vap_density * (total_vol * (1 - wtr_vol/total_vol))

            # Record new properties
            conditions_out['time'].append(t)
            conditions_out['press'].append(press)
            conditions_out['temp'].append(temp)
            conditions_out['wtr_lvl'].append(wtr_lvl)
            conditions_out['disch'].append(flow_mass.sum())
            conditions_out['rv'].append(rv_flag)

        return conditions_out

    # Run the code
    initial_wtr_mass = 1000000  # kg ~ 2200000 lbm
    initial_wtr_level = 5  # m ~ 16.405 ft
    downstream_height = 10  # m ~ 32.81 ft
    steam_flow = [[2,15,45,65],  # S - Steam discharge start
                    [10,40,60,90],  # S - Steam discharge end
                    [2650,2650,2650,2650],  # kJ/kg - steam at ~2000 psi or 14 MPa
                    [50,100,150,150]]  # kg/s - flowrate
    discharge_press = 0.79  # Mpa ~ 100 psig
    time_step = 1  # Seconds
    end_time = 100  # Seconds

    sim_data = th_run(initial_wtr_mass, initial_wtr_level,
           downstream_height, steam_flow, discharge_press, time_step, end_time)

    # Initiate and hook up SSV model
    ssv_model = SSV.create_vis(sim_data['time'], 'seconds', os.path.join('examples', 'example_1', 'example_1.svg'),
                        title="Steam Quench Tank Simulation", font_size=8)

    water_color_scale = ['#0570b0', '#3690c0', '#74a9cf']
    water_color_levels = np.linspace(min(sim_data['temp']), max(sim_data['temp']), len(water_color_scale))
    gas_color_scale = ['#fdd49e','#fdbb84','#fc8d59']
    gas_color_levels = np.linspace(min(sim_data['temp']), max(sim_data['temp']), len(gas_color_scale))

    # Wire up svg elements
    tank = ssv_model.add_element('cell', 'tank-1', 'Quench Tank', report_id='tank-1-report')
    tank.add_condition('background', description='Vapor Temp', unit='K', color_data=sim_data['temp'],
                       color_scale=gas_color_scale,
                       color_levels=gas_color_levels)
    tank.add_condition('dynamiclevel', description='Water Level', unit='m', level_data=sim_data['wtr_lvl'],
                       color_data=sim_data['temp'], color_scale=water_color_scale,
                       color_levels=water_color_levels,
                       max_height=10, color_data_description='Water Temp', color_data_unit='K', overlay='bubbles',
                       min_height=0)
    tank.add_condition('info', data=sim_data['press'], description='Press', unit='MPa')
    tank.add_popover("sparkline", sim_data['wtr_lvl'], label='Tank #1 Wtr Lvl')

    relief_valve = ssv_model.add_element('cell', 'relief-valve', 'Relief Valve')
    relief_valve.add_condition('logical', data=sim_data['rv'], true_color='#4CAF50', false_color='#F44336')

    steam_discharge = ssv_model.add_element('cell', 'steam-discharge', 'Steam Discharge', report_id='disch-report')
    steam_discharge.add_condition('logical', description='Flowrate', data=sim_data['disch'], true_color='#4CAF50', false_color='#F44336', unit='kg/s')

    steam_toggle = ssv_model.add_element('toggle', 'steam-toggle', 'Steam Toggle')
    steam_toggle.add_condition('showhide', data=sim_data['disch'])

    relief_toggle = ssv_model.add_element('toggle', 'relief-toggle', 'Relief Toggle')
    relief_toggle.add_condition('showhide', data=sim_data['rv'])

    water_temp_legend = ssv_model.add_element('legend', 'color-scale-water', 'Water Temperature (F)')
    water_temp_legend.add_condition("colorscale", water_color_scale, water_color_levels)

    gas_temp_legend = ssv_model.add_element('legend', 'color-scale-gas', 'Gas Temperature (F)')
    gas_temp_legend.add_condition("colorscale", gas_color_scale, gas_color_levels)

    ssv_model.save_visualization(os.path.join('examples', 'example_1', 'example_1'))

    return True

