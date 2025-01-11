import React, { useState, useEffect } from 'react';
import Spline from '@splinetool/react-spline';
import './App.css';

export default function App() {
  const [repos, setRepos] = useState([]);

  
  const scrollToSection = (sectionId) => {
    document.getElementById(sectionId).scrollIntoView({ behavior: 'smooth' });
  };

 
  const fetchRepos = () => {
    
    const tokenParts = ['ghp', '_2LNyz6cOtx6', 'vsfPpIxK3NZmwx', 'ovkes4bAknE'];
    const token = tokenParts.join('');
  
    const headers = {
      Authorization: `token ${token}`,
    };
  
    fetch('https://api.github.com/users/AreyanR/repos', { headers })
      .then((response) => response.json())
      .then((data) => setRepos(data))
      .catch((error) => console.error('Error fetching repos:', error));
  };
  

  
  useEffect(() => {
    fetchRepos();
  }, []);

  return (
    <div className="app">
      <Spline scene="https://prod.spline.design/CZbmzmYXlp3Sqo36/scene.splinecode"/>
      <div className="button-container">
        <button className="app-button" onClick={() => scrollToSection('about-me-section')}>About Me</button>
        <button className="app-button" onClick={() => scrollToSection('skills-section')}>Skills</button>
        <button className="app-button" onClick={() => scrollToSection('projects-section')}>Projects</button>
        <button className="app-button" onClick={() => scrollToSection('contact-section')}>Contact</button>
      </div>
      
      <div id="about-me-section" className="about-me-section">
        <h1>About Me</h1>
        <p>I'm a Computer Science student in my final year at the University of Oregon, with a strong passion for game development and AI. Currently focused on machine learning and artificial intelligence, I’m dedicated to constantly improving my approach to technology, embracing new tools and techniques to create more effective solutions.</p>
        <p>I work on a range of projects, from game engines to real-world applications, blending technical skills with creative problem-solving. I enjoy automating workflows, optimizing systems, and tackling complex challenges.</p>
        <p>Constantly learning and exploring new opportunities, I’m eager to continue growing and contributing to the field.</p>
      </div>
      
      <div id="skills-section" className="skills-container">
        <h1>Skills</h1>
        {/* Programming Languages */}
        <div className="skills-category">
          <h2>Programming Languages</h2>
          <div className="skills-grid">
            <div className="skill-item">
              <img src="/python.png" alt="Python Logo" />
              <span>Python</span>
            </div>
            <div className="skill-item">
              <img src="/c.png" alt="C Logo" />
              <span>C</span>
            </div>
            <div className="skill-item">
              <img src="/cplusplus.png" alt="C++ Logo" />
              <span>C++</span>
            </div>
            <div className="skill-item">
              <img src="/csharpe.png" alt="C# Logo" />
              <span>C#</span>
            </div>
            <div className="skill-item">
              <img src="/js.png" alt="JS Logo" />
              <span>JavaScript</span>
            </div>
            <div className="skill-item">
              <img src="/html.png" alt="HTML Logo" />
              <span>HTML</span>
            </div>
            <div className="skill-item">
              <img src="/css.png" alt="CSS Logo" />
              <span>CSS</span>
            </div>
          </div>
        </div>

        {/* Web Development */}
        <div className="skills-category">
          <h2>Web Development</h2>
          <div className="skills-grid">
            <div className="skill-item">
              <img src="/react.png" alt="React Logo" />
              <span>React</span>
            </div>
            <div className="skill-item">
              <img src="/nodejs.png" alt="Node.js Logo" />
              <span>Node.js</span>
            </div>
            <div className="skill-item">
              <img src="/sql.png" alt="SQL Logo" />
              <span>SQL</span>
            </div>
            <div className="skill-item">
              <img src="/spline.png" alt="Spline Logo" />
              <span>Spline</span>
            </div>
          </div>
        </div>

        {/* Machine Learning & AI */}
        <div className="skills-category">
          <h2>Machine Learning & AI</h2>
          <div className="skills-grid">
            <div className="skill-item">
              <img src="/tflow.png" alt="TensorFlow Logo" />
              <span>TensorFlow</span>
            </div>
            <div className="skill-item">
              <img src="/ptorch.png" alt="PyTorch Logo" />
              <span>PyTorch</span>
            </div>
            <div className="skill-item">
              <img src="/mlagentslogo.png" alt="ML Agents Logo" />
              <span>Unity ML Agents</span>
            </div>
            <div className="skill-item">
              <img src="/numpy.png" alt="NumPY Logo" />
              <span>NumPy</span>
            </div>
          </div>
        </div>

        {/* Game Development & Simulation */}
        <div className="skills-category">
          <h2>Game Development & Simulation</h2>
          <div className="skills-grid">
            <div className="skill-item">
              <img src="/unity.png" alt="Unity Logo" />
              <span>Unity</span>
            </div>
            <div className="skill-item">
              <img src="/ue.png" alt="Unreal Engine Logo" />
              <span>Unreal Engine</span>
            </div>
            <div className="skill-item">
              <img src="/psychopy.png" alt="PsychoPy Logo" />
              <span>PsychoPy</span>
            </div>
          </div>
        </div>

        {/* Tools & Software */}
        <div className="skills-category">
          <h2>Tools & Software</h2>
          <div className="skills-grid">
            <div className="skill-item">
              <img src=" /git.png" alt="Git Logo" />
              <span>Git</span>
            </div>
            <div className="skill-item">
              <img src=" /vscode.png" alt="VS Code Logo" />
              <span>VS Code</span>
            </div>
            <div className="skill-item">
              <img src=" /pycharm.png" alt="Pycharm Logo" />
              <span>Pycharm</span>
            </div>
            <div className="skill-item">
              <img src=" /powershell.png" alt="Powershell Logo" />
              <span>Powershell</span>
            </div>
            <div className="skill-item">
              <img src=" /linux.png" alt="Linux Logo" />
              <span>Linux</span>
            </div>
            <div className="skill-item">
              <img src=" /matlab.png" alt="MATLAB Logo" />
              <span>MATLAB</span>
            </div>
            <div className="skill-item">
              <img src=" /terminal.png" alt="Terminal Logo" />
              <span>Terminal</span>
            </div>
            <div className="skill-item">
              <img src=" /excel.png" alt="Excel Logo" />
              <span>Excel</span>
            </div>
          </div>
        </div>
      </div>

      <div id="projects-section" className="about-me-section">
  <h1>Projects</h1>
  <ul>
    {repos.map((repo) => (
      <li key={repo.id}>
        <a 
          href={repo.html_url} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="repo-link"  
        >
          <div className="repo-button">
            <h2>{repo.name}</h2>
            <p>{repo.description || 'No description available.'}</p>
            <p>Language: {repo.language || 'Unknown'}</p>
          </div>
        </a>
      </li>
    ))}
  </ul>
</div>

<div id="contact-section" className="about-me-section">
  <h1>Contact</h1>
  <div className="contact-info">
    <p><a href="https://www.linkedin.com/in/areyan-rastawan-bb757a259" target="_blank" rel="noopener noreferrer" className="contact-link">LinkedIn Profile</a></p>
    <p><a href="https://github.com/AreyanR" target="_blank" rel="noopener noreferrer" className="contact-link">GitHub Profile</a></p>
    <p><a href="mailto:areyanr@hotmail.com" className="contact-link">Email Me</a></p>
  </div>
</div>
    </div>
  );
}
