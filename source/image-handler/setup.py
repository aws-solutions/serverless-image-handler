# coding: utf-8

from setuptools import setup, find_packages
from pip.req import parse_requirements

tests_require = [
    'mock',
    'pytest'
]

setup(
    name='image_handler',
    version='2.0',
    description='AWS Serverless Image Handler',
    author='Ian Hartz',
    license='ASL',
    zip_safe=False,
    test_suite = 'tests',
    packages=['image_handler'],
    package_dir={'image_handler': '.'},
    include_package_data=True,
    package_data={
            '': ['*.conf'],
    },
    install_requires=[
        'botocore==1.3.7',
        'tornado_botocore==1.0.2',
        'requests_unixsocket>=0.1.5',
        'thumbor>=6.2.1',
        'tc_aws==6.0.3',
        'opencv-python==3.2.0.6'
    ],
    extras_require={
            'tests': tests_require,
        },
    classifiers=[
        'Programming Language :: Python :: 2.7',
    ],
)
