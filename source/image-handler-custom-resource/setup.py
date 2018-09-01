# coding: utf-8

from setuptools import setup, find_packages
try: # for pip >= 10
    from pip._internal.req import parse_requirements
except ImportError: # for pip <= 9.0.3
    from pip.req import parse_requirements

setup(
    name='image_handler_custom_resource',
    version='1.0',
    description='AWS Serverless Image Handler CFN Custom Resource',
    author='AWS Solutions Builder',
    license='ASL',
    zip_safe=False,
    packages=['image_handler_custom_resource'],
    package_dir={'image_handler_custom_resource': '.'},
    include_package_data=False,
    install_requires=[
        'image_handler_custom_resource>=1.0',
        'requests',
    ],
    classifiers=[
        'Programming Language :: Python :: 2.7',
    ],
)
