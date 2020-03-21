import json
import csv

with open("grid.json") as f:
    gridworld = json.load(f)

arr = []
for i in range(0, 23):
    arr.append([])
    for j in range(0, 28):
        arr[i].append(" ")

for country in gridworld:
    arr[country["y"]-1][country["x"]-1] = country["alpha3"]

with open("countrymap.csv","w+") as my_csv:
    csvWriter = csv.writer(my_csv,delimiter=',')
    csvWriter.writerows(arr)

for l in arr:
    print(l)