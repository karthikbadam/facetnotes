# FacetNotes: Annotation Exploration

This code repository provides a demonstration of our FacetNotes technique in a visual dashboard. It works with an open dataset for Airline delays available from Kaggle (instructions provided below).

The annotations are generated automatically from the  dataset using a Python script. They can be explored along with the dataset using a server-client architecture that serves a web-based visualization dashboard.

Below, we provide the instructions to install and setup on Mac OS.

## Install Dependencies
Make sure to use brew to install the dependencies on OS X.

### Install MongoDB
Use MongoDB to store the dataset along with the annotations. 
```
brew tap mongodb/brew
brew install mongodb-community@3.4
```

### Start Mongo
```
brew services start mongodb-community@3.4
```

### Install Python
```
brew install python2
pip install virtualenv
```
### Setup Python Dependencies
Use a python virtual environment to install the requirements.
```
python2 -m virtualenv venv
. venv/bin/activate
cp pip.conf venv/
pip install -r requirements.txt
```

## Load Dataset into MongoDB

### Airline Delays Dataset from 2015
This dataset was originally created by the Department of Transportation in the United States. It is a large dataset accounting to `500 Mb` in size. Hence it is not provided in this repository.

It is however available as an open dataset under public domain license. You can downloaded it from the [Kaggle](https://www.kaggle.com/usdot/flight-delays).

Once you download the dataset, copy the three files ```airlines.csv```, ```flights.csv```, and ```airports.csv``` into the ```input/``` folder.

To load the dataset into MongoDB and generate some annotations to explore, please use:
```
python scripts/mongo_insert_flights.py
```

## Start the Server
Once the dataset is loaded, you can start a Python server to explore the data on your web browser (Chrome or Safari are tested and recommended).

```
python app_flights.py
```

The application will be available at [localhost:3000](http://localhost:3000).

### Dashboard
![](images/airline-delays.png?raw=true)

![](images/airline-delays-annotation.png?raw=true)

