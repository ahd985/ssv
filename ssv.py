import json
import xml.etree.ElementTree as ET
import os

from jinja2 import Environment, PackageLoader
import numpy as np

# Main class
class SSV:
    svg_namespace = 'http://www.w3.org/2000/svg'
    supported_svg_attribs = ['viewBox', 'xmlns']
    element_classes = ['cell', 'line', 'heatmap', 'toggle', 'report']
    supported_svg = ['path', 'circle', 'rect', 'ellipse']

    def __init__(self, x_series, x_series_unit, svg_file_path, title='My Simulation', font_size=12):
        # Validate inputs
        if not isinstance(x_series_unit, str):
            raise TypeError('\'x_series_unit\' input must be a string.')
        if not isinstance(title, str):
            raise TypeError('\'title\' input must be a string.')

        try:
            x_series = np.array(x_series).astype('float')
            if len(x_series.shape) > 1 or len(x_series.shape) < 0:
                raise TypeError('\'x_series\' input must be 1 dimensional with at least one value.')
            self._x_series = x_series.tolist()
        except ValueError:
            raise ValueError('\'x_series\' input must be provided in an array-like numeric format')

        try:
            tree = ET.parse(svg_file_path)
            ET.register_namespace('', self.svg_namespace)
            svg_root = tree.getroot()
            if not svg_root.tag == '{%s}svg' % self.svg_namespace:
                raise ValueError('\'svg_file\' root element must be an svg.')

            # Loop through svg attributes and remove everything but viewBox so svg scales
            attribs = list(svg_root.attrib.keys())
            for attrib in attribs:
                if not attrib in self.supported_svg_attribs:
                    del svg_root.attrib[attrib]
            if not 'viewBox' in attribs:
                print('Warning: svg element has no viewBox attribute.  SVG will not scale to fit window.')

        except ET.ParseError:
            raise ET.ParseError('Invalid SVG file.')

        if not isinstance(font_size, int):
            raise TypeError('\'font_size\' must be provided as an integer.')

        # Set properties
        self._svg_root = svg_root
        self._title = title
        self._x_series_unit = x_series_unit
        self._elements = {element: {} for element in self.element_classes}
        self._svg_out = None
        self._font_size = font_size
        self._color_scales = []

    def add_element(self, element_type, element_ids, element_description='', **kwargs):
        if not isinstance(element_ids, (list, str)):
            raise TypeError('\'element_ids\' input must be a string or a list of strings.')
        if isinstance(element_ids, str):
            element_ids = [element_ids]

        if element_type == 'cell':
            element_entry = Cell(element_ids, element_description, len(self._x_series), **kwargs)
        elif element_type == 'line':
            element_entry = Line(element_ids, element_description, len(self._x_series), **kwargs)
        elif element_type == 'heatmap':
            element_entry = Heatmap(element_ids, element_description, len(self._x_series), **kwargs)
        elif element_type == 'toggle':
            element_entry = Toggle(element_ids, element_description, len(self._x_series), **kwargs)
        elif element_type == 'report':
            element_entry = Report(element_ids[0], element_description, len(self._x_series), **kwargs)
        else:
            raise ValueError('element type \'%s\' is not a supported type.' % element_type)
        self._elements[element_type].update({element_id: element_entry for element_id in element_ids})

        return element_entry

    def del_element(self, element_id):
        if not isinstance(element_id, str):
            raise TypeError('\'element_id\' input must be a string.')

        for element_type in self._elements:
            if element_id in self._elements[element_type]:
                del self._elements[element_type][element_id]

    def show_color_scale(self, color_scale, color_levels, color_scale_desc, color_scale_id):
        scale = ColorScale(color_scale, color_levels, color_scale_desc, color_scale_id)
        self._color_scales.append(scale)

    # Save ssv model as .html file
    def save_visualization(self, file_path):
        if not isinstance(file_path, str):
            raise TypeError('\'file_path\' input must be a string.')
        ext = '.html'
        if not ext == file_path[-len(ext)] and os.path.basename(file_path) != '':
            file_path += ext

        with open(file_path, 'w') as f:
            f.write(self.render_model())

    # Render ssv model using javascript, html, and css
    def render_model(self):
        env = Environment(loader=PackageLoader('ssv', 'templates'))
        template = env.get_template('ssv.html')
        element_data = {element_type:[] for element_type in self._elements.keys()}
        self.prepare_svg()

        for element_type, elements in self._elements.items():
            for element in set(elements.values()):
                element_dict = element.__dict__.copy()

                if 'conditions' in element_dict:
                    for i in range(len(element_dict['conditions'])):
                        element_dict['conditions'][i] = element_dict['conditions'][i].__dict__

                element_data[element_type].append(element_dict)

        color_scales_data = [scale.__dict__ for scale in self._color_scales]

        return template.render({'title': self._title, 'element_data': json.dumps(element_data),
                                'x_series': self._x_series, 'color_scales_data': json.dumps(color_scales_data),
                                'x_series_unit': self._x_series_unit, 'font_size': self._font_size,
                                'sim_visual': ET.tostring(self._svg_root, 'utf-8', method='xml').decode('utf-8')})

    # Function to clean and ready svg for output
    # Cleans svg of troublesome attributes and searches for user-provided element ids to bind data to
    def prepare_svg(self):
        # Add container elements to allow for zooming and panning
        # Add id to svg to allow for identification on front end
        g_zoom = ET.Element('g')
        g_zoom.attrib['id'] = 'zoom-container'

        for element in list(self._svg_root):
            if self.namespace_strip(element.tag) in self.supported_svg + ['g']:
                element_copy = element
                g_zoom.append(element_copy)
                self._svg_root.remove(element)

        overlay_rect = ET.Element('rect')
        overlay_rect.attrib['id'] = 'ssv-overlay'

        self._svg_root.attrib['id'] = 'ssv-svg'
        self._svg_root.insert(-1,g_zoom)
        self._svg_root.insert(-1,overlay_rect)

        # Build dict of element ids and include report ids
        elements = {k: v for e in list(self._elements.values()) for k, v in e.items()}
        element_ids = list(elements.keys())
        element_ids += [element.report_id for element in elements.values() if element.report_id is not None]
        element_ids += [color_scale.id for color_scale in self._color_scales]

        # Loop through element ids and see what's in the xml tree under supported svg elements
        for element_id in element_ids:
            elements_out = []

            for svg_element in self.supported_svg:
                parents = self._svg_root.findall(".//{http://www.w3.org/2000/svg}%s[@id='%s'].."
                                                            % (svg_element, element_id))
                elements_out += (self._svg_root.findall(".//{http://www.w3.org/2000/svg}%s[@id='%s']"
                                                            % (svg_element, element_id)))

                # add g parent element if more than one child exists for easier manipulation in javascript
                for parent in parents:
                    if len(parent) > 1:
                        for i, sub_element in enumerate(list(parent)):
                            if 'id' in sub_element.attrib and sub_element.attrib['id'] == element_id:
                                sub_element_copy = sub_element
                                g = ET.Element('g')
                                g.append(sub_element_copy)
                                parent.insert(i, g)
                                parent.remove(sub_element)

            # Search for g elements with id
            g_elements = self._svg_root.findall(".//{http://www.w3.org/2000/svg}g[@id='%s']" % element_id)
            if g_elements:
                for g_element in g_elements:
                    del g_element.attrib['id']
                    elements_out += self.element_recurse(g_element, element_id)

            # Warn user if input id is not found in svg and delete element_id
            if len(elements_out) < 1:
                print('Warning: SVG element with id \'%s\' not found for supported svg element types.'
                      '  No data will be bound to this element.' % element_id)

                self.del_element(element_id)

    # Return svg tag without namespace
    def namespace_strip(self, tag):
        return tag.split('}')[-1]

    # Recurse through an xml tree and search for specific id
    # Return list of all elements with specified id
    def find_all_id(self, element, name_id):
        target_elements = []

        for sub_element in list(element):
            tag = self.namespace_strip(sub_element.tag)

            if tag == 'g':
                target_elements += self.search_id(sub_element, name_id)
            elif tag in self.supported_svg:
                sub_element.attrib['id'] = name_id
                target_elements.append(sub_element)

        return target_elements

# Inheritable class for all elements
class Element:
    class Condition:
        input_types_allowed = {'type': str, 'report': bool, 'description': str, 'unit': str,
                               'color_scale': list, 'color_levels': list, 'data': list, 'opacity': (float, int)}
        required_inp_by_type = {'info': ['data', 'description']}

        def __init__(self, condition_id, **kwargs):
            self.id = condition_id
            for key, val in kwargs.items():
                if key in self.input_types_allowed and not isinstance(kwargs[key], self.input_types_allowed[key]):
                    raise TypeError('condition input \'%s\' must be of type \'%s\'' %
                                    (key, self.input_types_allowed[key]))
                setattr(self, key, val)

            if not self.type in self.required_inp_by_type:
                raise ValueError('condition type \'%s\' not supported' % self.type)

            for required_inp in self.required_inp_by_type[self.type]:
                try:
                    getattr(self, required_inp)
                except AttributeError:
                    raise AttributeError('condition attribute \'%s\' is required for condition type '
                                         '\'%s\'' % (required_inp, self.type))

    def __init__(self, element_ids, element_description, x_series_len, element_report_id):
        self.ids = element_ids
        if not isinstance(element_description, str):
            raise TypeError('\'element_description\' for \'%s\' must be a string.' % element_description)
        self.description = element_description
        if not element_report_id is None and not isinstance(element_report_id, str):
            raise TypeError('\'element_report_id\' for \'%s\' must be a string.' % element_description)
        self.x_series_len = x_series_len
        self.report_id = element_report_id
        self.conditions = []

    def add_condition(self, unit='', opacity=1.0, report=True, **kwargs):
        try:
            condition_data = np.array(kwargs['data']).astype('float')
            if self.x_series_len > condition_data.shape[0] > self.x_series_len:
                raise TypeError('data input for \'%s\' must be the '
                                'same length as the ssv x series' % self.description)
            kwargs['data'] = condition_data.tolist()
        except ValueError:
            raise ValueError('condition_data for \'%s\' must be provided in an '
                             'array-like numeric format' % self.description)
        except KeyError:
            raise KeyError('\'data\' kwarg not found for condition in %s' % self.description)

        condition_id = '%s_%d' % ('_'.join(self.ids), len(self.conditions))
        condition = self.Condition(condition_id, unit=unit, opacity=opacity, report=report, **kwargs)
        self.conditions.append(condition)

# Wrapper for cell
class Cell(Element):
    def __init__(self, cell_id, cell_description, x_series_len, cell_report_id=None):
        super(Cell, self).__init__(cell_id, cell_description, x_series_len, cell_report_id)
        self.Condition.input_types_allowed.update({'max_height': (float, int), 'data_dynamic': list,
                                                   'true_color': str, 'false_color': str, 'overlay': str})
        base_required = ['data']
        self.Condition.required_inp_by_type.update({'level_static': base_required + ['max_height', 'min_height'],
                                               'level_dynamic': base_required + ['max_height', 'min_height',
                                                                                 'data_dynamic', 'description_dynamic',
                                                                                 'color_scale', 'color_levels'],
                                               'background': base_required + ['color_scale', 'color_levels'],
                                               'logical': base_required + ['true_color', 'false_color'],
                                               'zonal_y': base_required + ['max_height', 'min_height',
                                                                           'data_dynamic', 'description_dynamic',
                                                                           'color_scale', 'color_levels']})
        self.conditions = []

    # Overwrite super's add_condition function to handle conditions that require dimensional and color data
    def add_condition(self, unit='', opacity=1.0, report=True, **kwargs):
        super(Cell, self).add_condition(unit=unit, opacity=opacity, report=report, **kwargs)

        # Logic for level_dynamic - requires dimensional data and color data
        if kwargs['type'] == 'level_dynamic':
            kwargs_dynamic = {'type': 'info',
                              'data': kwargs['data_dynamic'],
                              'description': kwargs['description_dynamic']}

            unit = kwargs['unit_dynamic'] if 'unit_dynamic' in kwargs else ''
            condition_id = '%s_%s' % ('_'.join(self.ids), 'dynamic')
            condition = self.Condition(condition_id, unit=unit, opacity=opacity, report=report, **kwargs_dynamic)
            self.conditions.append(condition)

        # Logic for zonal visualization - requires dimensional and color data
        if kwargs['type'] == 'zonal_y':
            if not isinstance(kwargs['data'][0], list) or 2 < len(kwargs['data'][0]) < 2:
                raise TypeError('data input for \'%s\' zonal model must be the of len 2 in the 2nd dimension' %
                                self.description)

            kwargs_dynamic = {'type': 'info',
                  'data': kwargs['data_dynamic'],
                  'description': kwargs['description_dynamic']}

            unit = kwargs['unit_dynamic'] if 'unit_dynamic' in kwargs else ''
            condition_id = '%s_%s' % ('_'.join(self.ids), 'dynamic')
            condition = self.Condition(condition_id, unit=unit, opacity=opacity, report=report, **kwargs_dynamic)
            self.conditions.append(condition)

# Wrapper for line
class Line(Element):
    def __init__(self, line_id, line_description, x_series_len, line_report_id=None):
        super(Line, self).__init__(line_id, line_description, x_series_len, line_report_id)
        base_required = ['data']
        self.Condition.required_inp_by_type.update({'sections_equal': base_required + ['color_scale', 'color_levels']})
        self.conditions = []

# Wrapper for heatmap
# AHD - check that axis 1 matches x_series_len
class Heatmap(Element):
    def __init__(self, heatmap_id, heatmap_description, x_series_len, heatmap_report_id=None):
        super(Heatmap, self).__init__(heatmap_id, heatmap_description, x_series_len, heatmap_report_id)
        base_required = ['data']
        self.Condition.required_inp_by_type.update({'rect': base_required + ['color_scale', 'color_levels']})
        self.conditions = []

# Wrapper for toggle
class Toggle(Element):
    def __init__(self, toggle_id, toggle_description, x_series_len, toggle_report_id=None):
        super(Toggle, self).__init__(toggle_id, toggle_description, x_series_len, toggle_report_id)
        base_required = ['data']
        self.Condition.required_inp_by_type.update({'show_hide': base_required})
        self.conditions = []

# Wrapper for report
class Report(Element):
    def __init__(self, report_id, report_description, x_series_len, show_tabular=False):
        super(Report, self).__init__('', report_description, x_series_len, report_id)
        base_required = ['data']

        if not isinstance(show_tabular, bool):
            raise TypeError('show_tabular must be of type bool.')
        # AHD - if show_tabular then description must be array
        self.show_tabular = show_tabular

        self.conditions = []

# Wrapper for color scale legend
class ColorScale:
    def __init__(self, color_scale, color_levels, color_scale_desc, color_scale_id):
        if not isinstance(color_scale, list) or not isinstance(color_levels, list):
            raise TypeError('color_scale and color_levels must be a list.')
        if not isinstance(color_scale_id, str):
            raise TypeError('color_scale_id must be a string.')
        if not isinstance(color_scale_desc, str):
            raise TypeError('color_scale_desc must be a string.')

        self.scale = color_scale
        self.levels = color_levels
        self.desc = color_scale_desc
        self.id = color_scale_id


