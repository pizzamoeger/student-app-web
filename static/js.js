function displayClasses(classes) {
    for (const clazz of classes) {
        const class_div = document.createElement("div");
        class_div.id = "class" + clazz.id;
        class_div.style.backgroundColor = intToRGBHex(clazz.color);
        class_div.style.height = "20px";
        document.getElementById("classes-div").appendChild(class_div);
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
};