import json
import xml.etree.ElementTree as ET
import os

from jinja2 import Environment, PackageLoader
import numpy as np

from . import elements


# Main class
class SSV:
    _svg_namespace = 'http://www.w3.org/2000/svg'
    _supported_svg_attribs = ['viewBox', 'xmlns']
    _supported_svg = ['path', 'circle', 'rect', 'ellipse']

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
            ET.register_namespace('', self._svg_namespace)
            svg_root = tree.getroot()
            if not svg_root.tag == '{%s}svg' % self._svg_namespace:
                raise ValueError('\'svg_file\' root element must be an svg.')

            # Loop through svg attributes and remove everything but viewBox so svg scales
            attribs = list(svg_root.attrib.keys())
            for attrib in attribs:
                if not attrib in self._supported_svg_attribs:
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
        self._elements = {element: {} for element in [cls.__name__.lower() for
                                                      cls in elements.Element.__subclasses__()]}
        self._svg_out = None
        self._font_size = font_size
        self._color_scales = []

    def add_element(self, element_type, element_ids, element_description='', **kwargs):
        if not isinstance(element_ids, (list, str)):
            raise TypeError('\'element_ids\' input must be a string or a list of strings.')
        if isinstance(element_ids, str):
            element_ids = [element_ids]

        element_entry = None
        for cls in elements.Element.__subclasses__():
            if element_type.lower() in cls.__name__.lower():
                element_entry = cls(element_ids, element_description, len(self._x_series), **kwargs)
                self._elements[cls.__name__.lower()].update({element_id: element_entry for element_id in element_ids})
                return element_entry

        if element_entry is None:
            raise ValueError('element type \'%s\' is not a supported type.' % element_type)

    def del_element(self, element_id):
        if not isinstance(element_id, str):
            raise TypeError('\'element_id\' input must be a string.')

        for element_type in self._elements:
            if element_id in self._elements[element_type]:
                del self._elements[element_type][element_id]

    def show_color_scale(self, color_scale, color_levels, color_scale_desc, color_scale_id):
        scale = elements.ColorScale(color_scale, color_levels, color_scale_desc, color_scale_id)
        self._color_scales.append(scale)

    # Save ssv model as .html file
    def save_visualization(self, file_path):
        if not isinstance(file_path, str):
            raise TypeError('\'file_path\' input must be a string.')
        ext = '.html'
        if len(file_path) < len(ext) or not ext == file_path[-len(ext)] and os.path.basename(file_path) != '':
            file_path += ext

        with open(file_path, 'w') as f:
            f.write(self.render_model())

    # Render ssv model using javascript, html, and css
    def render_model(self):
        env = Environment(loader=PackageLoader('ssv', ''))
        template = env.get_template(os.path.join('templates', 'ssv.html'))
        element_data = {element_type: [] for element_type in self._elements.keys()}
        self._prepare_svg()

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
    def _prepare_svg(self):
        # Add container elements to allow for zooming and panning
        # Add id to svg to allow for identification on front end
        g_zoom = ET.Element('g')
        g_zoom.attrib['id'] = 'zoom-container'

        for element in list(self._svg_root):
            if self._namespace_strip(element.tag) in self._supported_svg + ['g']:
                element_copy = element
                g_zoom.append(element_copy)
                self._svg_root.remove(element)

        overlay_rect = ET.Element('rect')
        overlay_rect.attrib['id'] = 'ssv-overlay'

        self._svg_root.attrib['id'] = 'ssv-svg'
        self._svg_root.insert(-1, g_zoom)
        self._svg_root.insert(-1, overlay_rect)

        # Build dict of element ids and include report ids
        elements = {k: v for e in list(self._elements.values()) for k, v in e.items()}
        element_ids = list(elements.keys())
        element_ids += [element.report_id for element in elements.values() if element.report_id is not None]
        element_ids += [color_scale.id for color_scale in self._color_scales]

        # Loop through element ids and see what's in the xml tree under supported svg elements
        for element_id in element_ids:
            elements_out = []

            for svg_element in self._supported_svg:
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
                    elements_out += self._find_all_id(g_element, element_id)

            # Warn user if input id is not found in svg and delete element_id
            if len(elements_out) < 1:
                print('Warning: SVG element with id \'%s\' not found for supported svg element types.'
                      '  No data will be bound to this element.' % element_id)

                self.del_element(element_id)

    # Return svg tag without namespace
    def _namespace_strip(self, tag):
        return tag.split('}')[-1]

    # Recurse through an xml tree and search for specific id
    # Return list of all elements with specified id
    def _find_all_id(self, element, name_id):
        target_elements = []

        for sub_element in list(element):
            tag = self._namespace_strip(sub_element.tag)

            if tag == 'g':
                target_elements += self.search_id(sub_element, name_id)
            elif tag in self._supported_svg:
                sub_element.attrib['id'] = name_id
                target_elements.append(sub_element)

        return target_elements


