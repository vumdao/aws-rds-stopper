#!/bin/bash

mkdir -p tmp
pip install requests -t tmp
cp app.py tmp/
cd tmp
tar czf handler.tar.gz *
mv handler.tar.gz ../
cd -
