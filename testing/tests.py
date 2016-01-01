import unittest

from selenium import webdriver


class TestInputs(unittest.TestCase):
    def build_full_model(self):
        pass

    def build_bad_svg(self):
        pass

    def element_name_collision(self):
        pass

    def incompatible_svg(self):
        pass

    def ssv_bad_initialization(self):
        pass

    def element_bad_initialization(self):
        pass

    def condition_bad_initialization(self):
        pass



"""
  def test_upper(self):
      self.assertEqual('foo'.upper(), 'FOO')

  def test_isupper(self):
      self.assertTrue('FOO'.isupper())
      self.assertFalse('Foo'.isupper())

  def test_split(self):
      s = 'hello world'
      self.assertEqual(s.split(), ['hello', 'world'])
      # check that s.split fails when the separator is not a string
      with self.assertRaises(TypeError):
          s.split(2)
"""

class TestInterface(unittest.TestCase):
    def setUp(self):
        self.browser = webdriver.Chrome()
        self.addCleanup(self.browser.quit)

    def test_page_title(self):
        self.browser.get('http://www.google.com')
        self.assertIn('Google', self.browser.title)

    """
    def test_search_in_python_org(self):
        driver = self.driver
        driver.get("http://www.python.org")
        self.assertIn("Python", driver.title)
        elem = driver.find_element_by_name("q")
        elem.send_keys("pycon")
        elem.send_keys(Keys.RETURN)
        assert "No results found." not in driver.page_source
    """

    def tearDown(self):
        self.browser.close()

if __name__ == '__main__':
    unittest.main(verbosity=2)
