import csv
import json
arr = []


with open("mycountries.geojson", encoding="utf-8") as f:
    data = json.load(f)

with open("fixedmap.csv") as f:
    reader = csv.reader(f, delimiter=",")
    for row in reader:
        arr.append(row)

data2 = data["features"]
ret = []
y = 0
for line in arr:
    x = 0
    for el in line:
        if el != "":
            country = list(filter(lambda x:x["properties"]["ISO3_CODE"]==el, data2))
            if country != []:
                print(country)
                name = country[0]["properties"]["NAME_ENGL"]
            else:
                name = ""
            t = {
                "name": name,
                "code": el,
                "x": x,
                "y": y
            }

            ret.append(t)
        x += 1
    y += 1

with open("mygrid.json", "w+") as f:
    json.dump(ret, f)




print(list(filter(lambda x:x["properties"]["ISO3_CODE"]=="AND", data2)))

