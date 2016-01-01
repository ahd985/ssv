import ssv

# Comment

x = ssv.SSV([1, 2, 3, 4, 5], 'seconds', 'sample/drawing.svg', font_size=12)
cell = x.add_element('cell', 'box_1', 'Box 1', cell_report_id='report_1')
cell.add_condition(type='background', description='Air Temp', unit='F', data=[1, 2, 3, 4, 5], color_scale=['#ffffb2','#fecc5c','#fd8d3c','#f03b20','#bd0026'],
                   color_levels=[1, 2, 3, 4, 5], opacity=0.1)
cell.add_condition(type='level_dynamic', description='Water Level', unit='ft', data=[1,2,1,3,4], data_dynamic=[1,2,3,4,5], color_scale=['#f1eef6','#bdc9e1','#74a9cf','#2b8cbe','#045a8d'], color_levels=[1,2,3,4,5], max_height=5.0, dynamic_description='Water Temp', dynamic_unit='F')
cell.add_condition(type='info', data=[1,1,1,1,1], description='Fire')

cell = x.add_element('cell', 'box_2', 'Box 2')
cell.add_condition(type='background', description='Air Temp', unit='F', data=[3, 3, 3, 5, 5], color_scale=['#ffffb2','#fecc5c','#fd8d3c','#f03b20','#bd0026'],
                   color_levels=[1, 2, 3, 4, 5])
cell.add_condition(type='level_static', description='Water Level', unit='ft', data=[1,1.5,2,2.5,3], color='blue', max_height=5.0)

cell = x.add_element('cell', 'junction_1', 'Junction 1')
cell.add_condition(type='background', description='Air Temp', unit='F', data=[5, 5, 5, 5, 5], color_scale=['#ffffb2','#fecc5c','#fd8d3c','#f03b20','#bd0026'],
                   color_levels=[1, 2, 3, 4, 5], opacity=0.3)

line = x.add_element('line', ['line_1','line_3'], 'Line 1')
line.add_condition(type='sections_equal', opacity=1.0, data=[[1,2,3],[5,5,5],[3,3,3],[1,1,1],[2,2,2]], color_scale=['#ffffb2','#fecc5c','#fd8d3c','#f03b20','#bd0026'], color_levels=[1,2,3,4,5], description="Lower Head Temp", unit='F')

line = x.add_element('line', ['line_2','line_4'], 'Line 2')
line.add_condition(type='sections_equal', data=[1,2,3,4,5], color_scale=['#ffffb2','#fecc5c','#fd8d3c','#f03b20','#bd0026'], color_levels=[2,2,2,3,3], description="Upper Head Temp", unit='F')

hm = x.add_element('heatmap', ['hm_1'], 'Core')
hm.add_condition(type='rect', opacity=1.0, data=[[[1,1,1],[2,2,2],[3,3,3]],[[1,1,1],[2,2,2],[3,3,3]],[[2,2,2],[2,3,2],[3,3,3]],[[2,3,2],[3,3,3],[3,3,3]],[[3,3,3],[3,3,3],[3,3,3]]], color_scale=['#ffffb2','#fecc5c','#fd8d3c','#f03b20','#bd0026'], color_levels=[1,2,3,4,5], description="Core Temperature", unit='F')

x.save_visualization('/Users/Alex/Desktop/dose/s')