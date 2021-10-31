#!/usr/bin/env python3

import os
import sys
import json
import glob
import subprocess


GLOBAL_S3_ASSETS_PATH = os.environ['GLOBAL_S3_ASSETS_PATH']
REGIONAL_S3_ASSETS_PATH = os.environ['REGIONAL_S3_ASSETS_PATH']


class Color(object):
    ISATTY = os.isatty(1)
    COLORS = {
        'red': '\x1b[31m',
        'green': '\x1b[32m',
        'yellow': '\x1b[33m',
        'blue': '\x1b[34m',
        'reset': '\x1b[0m'
    }

    @staticmethod
    def c(s, code):
        if Color.ISATTY:
            return Color.COLORS[code] + s + Color.COLORS['reset']
        return s

    @staticmethod
    def red(s):
        return Color.c(s, 'red')

    @staticmethod
    def green(s):
        return Color.c(s, 'green')

    @staticmethod
    def yellow(s):
        return Color.c(s, 'yellow')

    @staticmethod
    def blue(s):
        return Color.c(s, 'blue')


def get_file_assets(filename):
    with open(filename, 'r') as fp:
        assets = json.load(fp)
        files = assets['files']

        def _add_key(k, v):
            v['_id'] = k
            return v

        return [_add_key(k, v) for k, v in files.items()]


def sh(*args):
    return subprocess.call(*args, shell=True)


def zip(src, dst):
    print(f'{Color.yellow("[zip]")} {Color.green(f"{src} => {dst}")}')
    sh(f'cd {src} && zip -r {dst} .')


def cp(src, dst):
    print(f'{Color.yellow("[cp]")} {Color.green(f"{src} => {dst}")}')
    sh(f'cp {src} {dst}')


def main():
    dir_in = os.path.abspath(sys.argv[1])
    assets = glob.glob(os.path.join(dir_in, '*.assets.json'))

    for asset in assets:
        print(f'from {Color.blue(asset)}')
        file_assets = get_file_assets(asset)
        for file in file_assets:
            source = file['source']
            src = os.path.join(dir_in, source['path'])
            if src.endswith('template.json'):
                dst = os.path.abspath(os.path.join(GLOBAL_S3_ASSETS_PATH, file['_id'].replace('.json', '')))
            else:
                dst = os.path.abspath(os.path.join(REGIONAL_S3_ASSETS_PATH, file['_id']))
            if source['packaging'] == 'zip':
                zip(src, dst)
            elif source['packaging'] == 'file':
                cp(src, dst)


if __name__ == '__main__':
    main()
