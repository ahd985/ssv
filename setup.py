""" Simplified Simulation Visualization (SSV) Setup.
See:
https://github.com/ahd985/ssv
"""

from setuptools import setup, find_packages
# To use a consistent encoding
from codecs import open
from os import path

here = path.abspath(path.dirname(__file__))

# Get the long description from the README file
with open(path.join(here, 'README.rst'), encoding='utf-8') as f:
    long_description = f.read()

setup(
    name='ssv',
    version='0.0.1',
    description='Simplified Simulation Visualization',
    long_description=long_description,
    url='https://github.com/ahd985/ssv',
    author='Alex Duvall',
    author_email='ahd985@gmail.com',
    license='MIT',
    classifiers=[
        'Development Status :: 3 - Alpha',
        'Intended Audience :: End Users/Desktop',
        'Topic :: Scientific/Engineering :: Visualization',
        'License :: OSI Approved :: MIT License',
        'Programming Language :: Python :: 3.3',
        'Programming Language :: Python :: 3.4',
        'Programming Language :: Python :: 3.5',
    ],
    keywords='simulation visualization',
    packages=find_packages(exclude=['contrib', 'docs', 'tests']),
    install_requires=['pandas', 'jinja2', 'numpy'],
    extras_require={
        'dev': [],
        'test': ['pytest'],
    },
)