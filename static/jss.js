
function displayClasses(classes) {
    for (const clazz of classes) {
        const template = document.getElementById("class-blueprint")
        const container = document.getElementById("classes-div")

        const clone = template.content.cloneNode(true);
        clone.id = "class" + clazz.id;
        const card = clone.querySelector('.card');
        card.style.backgroundColor = intToRGBHex(clazz.color);
        card.querySelector('h3').textContent = clazz.name
        //clone.style.height = "20px";

        container.appendChild(clone);

        /*
                */
         
    }
}


function intToRGBHex(intValue) {
    // Convert signed integer to unsigned 24-bit
    const unsigned = (intValue + 16777216) & 0xFFFFFF;
  
    // Extract RGB components
    const r = (unsigned >> 16) & 0xFF;
    const g = (unsigned >> 8) & 0xFF;
    const b = unsigned & 0xFF;
  
    // Convert to hex and pad with zeros if necessary
    const hex = '#' + [r, g, b]
      .map(x => x.toString(16).padStart(2, '0'))
      .join('');
  
    return hex;
}
  
function addClass() {
    location.href = "/add_class.html";
}

function getClasses() {
    return fetch('data/classes.json')
  .then(response => response.json())
  .catch(error => console.error('Error fetching JSON:', error));
}

window.onload = () => {
    getClasses()
        .then(classes => {
            displayClasses(classes);
        })
        .catch(error => {
            console.error("Error initializing classes:", error);
        });
    document.getElementById('addClassButton').addEventListener('click', function() {
        addClass()
    });
};


