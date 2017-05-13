import examples.example_1.example_1 as e1
import examples.example_2.example_2 as e2
import examples.example_3.example_3 as e3
import examples.example_4.example_4 as e4
import examples.example_5.example_5 as e5

# Function to run all example cases
def run():
    passed = [e1.run(), e2.run(), e3.run(), e4.run(), e5.run()]
    return passed

if __name__ == '__main__':
    run()