document.addEventListener("DOMContentLoaded", function() {
  fetch("./results.json")
    .then(response => response.json())
    .then(json => loadImages(json))
    .catch(e => console.error(e));

  function loadImages(array) {
    const data = d3
      .nest()
      .key(d => d.title)
      .entries(array);

    const container = document.querySelector(".container");

    data.forEach(section => {
      var title = section.key;
      var images = section.values;
      var section = document.createElement("section");
      section.classList.add("section");
      var imageContainer = document.createElement("div");
      imageContainer.classList.add("images");
      var sectionTitle = document.createElement("h1");
      sectionTitle.classList.add("section--title");
      sectionTitle.textContent = title;
      container.appendChild(section);
      section.appendChild(sectionTitle);
      section.appendChild(imageContainer);
      // var template = `
      //   <h1 class="section--title">${title}</h1>
      //   <div class="images"></div>
      // `;
      // section.innerHTML = template;
      images.forEach(image => {
        // var link = document.createElement("a");
        var img = document.createElement("img");
        img.classList.add("lozad");
        img.setAttribute("data-src", image.path);
        imageContainer.appendChild(img);
        const observer = lozad(img, {
          loaded: function(el) {
            Lightense(el);
          }
        });
        observer.observe();
      });
    });
  }
});
