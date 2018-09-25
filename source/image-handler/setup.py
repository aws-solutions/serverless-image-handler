# coding: utf-8

from setuptools import setup, find_packages
# SO-SIH-156 - 07/16/2018 - Pip version
# pip version handling
try: # for pip >= 10
    from pip._internal.req import parse_requirements
except ImportError: # for pip <= 9.0.3
    from pip.req import parse_requirements

tests_require = [
    'mock==2.0.0',
    'pytest==3.5.0'
]

setup(
    name='image_handler',
    version='3.0',
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
        'botocore==1.8.0',
        # SO-SIH-159 - 07/18/2018 - Version and dependencies fix
        # Locking botocore, pycurl version and moving dependencies from requirements
        'tornado==5.0.1',
        'pycurl==7.43.0.1',
        'tornado_botocore==1.3.0',
        'requests_unixsocket==0.1.5',
        'thumbor==6.5.1',
        'thumbor-plugins==0.2.0',
        # SO-SIH-155 - 07/18/2018 - Rekognition integration
        # Adding Rekognition
        'thumbor_rekognition==0.1.1',
        'tc_aws==6.2.10',
        'opencv-python==3.2.0.6'
    ],
    extras_require={
            'tests': tests_require,
        },
    classifiers=[
        'Programming Language :: Python :: 2.7',
    ],
)
