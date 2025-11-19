import React, { useState, useEffect } from 'react';
import Spline from '@splinetool/react-spline';
import './App.css';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './components/ui/card';
import { Badge } from './components/ui/badge';
import { Separator } from './components/ui/separator';
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext, setCarouselUserInteractionCallback } from './components/ui/carousel';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './components/ui/tooltip';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './components/ui/accordion';
import { PolarAngleAxis, PolarGrid, Radar, RadarChart } from 'recharts';
import { ChartContainer, ChartTooltip } from './components/ui/chart';
import { TrendingUp, CheckCircle2 } from 'lucide-react';

export default function App() {
  const [repos, setRepos] = useState([]);
  const [visibleSections, setVisibleSections] = useState({
    about: false,
    skills: false,
    projects: false,
    contact: false,
    experience: false,
    education: false,
    projectsCarousel: false
  });
  
  const [contributions, setContributions] = useState([]);
  const [languages, setLanguages] = useState({});
  const [chartData, setChartData] = useState([]);
  const [socialStats, setSocialStats] = useState({
    githubFollowers: 0,
    githubRepos: 0,
    githubStars: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [apiError, setApiError] = useState(null);
  const [carouselApi, setCarouselApi] = useState(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isDraggingDots, setIsDraggingDots] = useState(false);
  const [isDraggingProjectsDots, setIsDraggingProjectsDots] = useState(false);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [educationCarouselApi, setEducationCarouselApi] = useState(null);
  const [projectsCarouselApi, setProjectsCarouselApi] = useState(null);
  const [currentProjectSlide, setCurrentProjectSlide] = useState(0);
  const [isProjectsAutoPlaying, setIsProjectsAutoPlaying] = useState(true);
  const [selectedProjectIndex, setSelectedProjectIndex] = useState(null);

  const scrollToSection = (sectionId) => {
    document.getElementById(sectionId).scrollIntoView({ behavior: 'smooth' });
    setTimeout(() => {
      const key = sectionId.replace('-section', '').replace('-me', '');
      setVisibleSections(prev => ({ ...prev, [key]: true }));
    }, 300);
  };

  // Handle dragging on dots area
  const handleDotsMouseDown = (e) => {
    e.preventDefault();
    handleCarouselInteraction();
    setIsDraggingDots(true);
    handleDotsDrag(e);
  };

  const handleDotsMouseMove = (e) => {
    if (isDraggingDots) {
      e.preventDefault();
      handleDotsDrag(e);
    }
  };

  const handleDotsMouseUp = () => {
    setTimeout(() => setIsDraggingDots(false), 50);
  };

  const handleDotsDrag = (e) => {
    const container = e.currentTarget;
    const rect = container.getBoundingClientRect();
    const x = (e.clientX || e.touches?.[0]?.clientX) - rect.left;
    const width = rect.width;
    const percentage = Math.max(0, Math.min(1, x / width));
    const slideIndex = Math.round(percentage * 4);
    carouselApi?.scrollTo(slideIndex);
  };

  // Handle dragging on projects dots area
  const handleProjectsDotsMouseDown = (e) => {
    e.preventDefault();
    handleProjectsCarouselInteraction();
    setIsDraggingProjectsDots(true);
    handleProjectsDotsDrag(e);
  };

  const handleProjectsDotsMouseMove = (e) => {
    if (isDraggingProjectsDots) {
      e.preventDefault();
      handleProjectsDotsDrag(e);
    }
  };

  const handleProjectsDotsMouseUp = () => {
    setTimeout(() => setIsDraggingProjectsDots(false), 50);
  };

  const handleProjectsDotsDrag = (e) => {
    const container = e.currentTarget;
    const rect = container.getBoundingClientRect();
    const x = (e.clientX || e.touches?.[0]?.clientX) - rect.left;
    const width = rect.width;
    const percentage = Math.max(0, Math.min(1, x / width));
    const slideIndex = Math.round(percentage * (repos.length - 1));
    projectsCarouselApi?.scrollTo(slideIndex);
  };

  // Handle global mouse events for dragging
  useEffect(() => {
    if (!isDraggingDots) return;

    let rafId = null;
    let lastSlideIndex = -1;

    const handleGlobalMouseMove = (e) => {
      if (rafId) return; // Skip if already scheduled
      
      rafId = requestAnimationFrame(() => {
        const dotsContainer = document.querySelector('.dots-container');
        if (dotsContainer) {
          const rect = dotsContainer.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const width = rect.width;
          const percentage = Math.max(0, Math.min(1, x / width));
          const slideIndex = Math.round(percentage * 4);
          
          // Only scroll if the index changed
          if (slideIndex !== lastSlideIndex) {
            lastSlideIndex = slideIndex;
            carouselApi?.scrollTo(slideIndex);
          }
        }
        rafId = null;
      });
    };

    const handleGlobalMouseUp = () => {
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      setIsDraggingDots(false);
    };

    document.addEventListener('mousemove', handleGlobalMouseMove, { passive: true });
    document.addEventListener('mouseup', handleGlobalMouseUp);

    return () => {
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isDraggingDots, carouselApi]);

  // Handle global mouse events for projects dots dragging
  useEffect(() => {
    if (!isDraggingProjectsDots) return;

    let rafId = null;
    let lastSlideIndex = -1;

    const handleGlobalMouseMove = (e) => {
      if (rafId) return; // Skip if already scheduled
      
      rafId = requestAnimationFrame(() => {
        const dotsContainer = document.querySelector('.projects-dots-container');
        if (dotsContainer && repos.length > 0) {
          const rect = dotsContainer.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const width = rect.width;
          const percentage = Math.max(0, Math.min(1, x / width));
          const slideIndex = Math.round(percentage * (repos.length - 1));
          
          // Only scroll if the index changed
          if (slideIndex !== lastSlideIndex) {
            lastSlideIndex = slideIndex;
            projectsCarouselApi?.scrollTo(slideIndex);
          }
        }
        rafId = null;
      });
    };

    const handleGlobalMouseUp = () => {
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      setIsDraggingProjectsDots(false);
    };

    const handleGlobalTouchMove = (e) => {
      if (rafId) return; // Skip if already scheduled
      
      rafId = requestAnimationFrame(() => {
        const dotsContainer = document.querySelector('.projects-dots-container');
        if (dotsContainer && repos.length > 0 && e.touches.length > 0) {
          const rect = dotsContainer.getBoundingClientRect();
          const x = e.touches[0].clientX - rect.left;
          const width = rect.width;
          const percentage = Math.max(0, Math.min(1, x / width));
          const slideIndex = Math.round(percentage * (repos.length - 1));
          
          // Only scroll if the index changed
          if (slideIndex !== lastSlideIndex) {
            lastSlideIndex = slideIndex;
            projectsCarouselApi?.scrollTo(slideIndex);
          }
        }
        rafId = null;
      });
    };

    document.addEventListener('mousemove', handleGlobalMouseMove, { passive: true });
    document.addEventListener('mouseup', handleGlobalMouseUp);
    document.addEventListener('touchmove', handleGlobalTouchMove, { passive: false });
    document.addEventListener('touchend', handleGlobalMouseUp);

    return () => {
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
      document.removeEventListener('touchmove', handleGlobalTouchMove);
      document.removeEventListener('touchend', handleGlobalMouseUp);
    };
  }, [isDraggingProjectsDots, projectsCarouselApi, repos.length]);

  // Fetch GitHub stats
  useEffect(() => {
    const fetchGitHubStats = async () => {
      setIsLoading(true);
      setApiError(null);
      try {
        const userResponse = await fetch('https://api.github.com/users/AreyanR');
        if (!userResponse.ok) {
          const errorText = await userResponse.text();
          console.error('User API error:', errorText);
          throw new Error(`GitHub API error: ${userResponse.status} ${userResponse.statusText}`);
        }
        const userDataResponse = await userResponse.json();
        console.log('User data fetched:', userDataResponse);
        
        if (userDataResponse.message) {
          throw new Error(userDataResponse.message);
        }
        
        // Fetch public repos - no authentication needed for public data
        const reposResponse = await fetch('https://api.github.com/users/AreyanR/repos');
        
        if (!reposResponse.ok) {
          const errorText = await reposResponse.text();
          console.error('Repos API error:', errorText);
          throw new Error(`GitHub API error: ${reposResponse.status} ${reposResponse.statusText}`);
        }
        
        const reposData = await reposResponse.json();
        console.log('Repos data fetched:', reposData.length, 'repos');
        
        if (!Array.isArray(reposData)) {
          console.error('Repos data is not an array:', reposData);
          if (reposData.message) {
            throw new Error(reposData.message);
          }
          throw new Error('Invalid repos data format');
        }
        
        const totalStars = reposData.reduce((sum, repo) => sum + repo.stargazers_count, 0);
        
        const langCount = {};
        for (const repo of reposData) {
          if (repo.language) {
            langCount[repo.language] = (langCount[repo.language] || 0) + 1;
          }
        }
        
        const totalRepos = reposData.length;
        const languagesWithPercentages = Object.entries(langCount)
          .map(([lang, count]) => ({
            language: lang,
            count: count,
            percentage: ((count / totalRepos) * 100).toFixed(1)
          }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10);
        
        const sortedLanguages = {};
        languagesWithPercentages.forEach(({ language, count, percentage }) => {
          sortedLanguages[language] = { count, percentage: parseFloat(percentage) };
        });
        
        const topLanguages = languagesWithPercentages.slice(0, 6);
        const maxPercentage = topLanguages.length > 0 ? parseFloat(topLanguages[0].percentage) : 100;
        
        const radarData = topLanguages.map(({ language, percentage }) => {
          const truePercentage = parseFloat(percentage);
          const normalized = maxPercentage > 0 ? (truePercentage / maxPercentage) : 0;
          const compressed = Math.sqrt(normalized) * 100;
          const visualValue = Math.max(compressed, 60);
          
          return {
            language: language.length > 10 ? language.substring(0, 10) : language,
            usage: visualValue,
            truePercentage: truePercentage
          };
        });
        
        console.log('Setting chart data:', radarData);
        console.log('Setting repos:', reposData.length, 'repos');
        setRepos(reposData);
        setLanguages(sortedLanguages);
        setChartData(radarData);
        
        setSocialStats({
          githubFollowers: userDataResponse.followers || 0,
          githubRepos: userDataResponse.public_repos || 0,
          githubStars: totalStars
        });

        generateContributionCalendar();
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching GitHub stats:', error);
        setApiError(error.message);
        setRepos([]);
        setChartData([]);
        setLanguages({});
        generateContributionCalendar();
        setIsLoading(false);
      }
    };

    fetchGitHubStats();
  }, []);

  // Carousel slide tracking
  useEffect(() => {
    if (!carouselApi) {
      return;
    }

    setCurrentSlide(carouselApi.selectedScrollSnap());

    carouselApi.on("select", () => {
      setCurrentSlide(carouselApi.selectedScrollSnap());
    });
  }, [carouselApi]);

  // Auto-play carousel
  useEffect(() => {
    if (!carouselApi || !isAutoPlaying) {
      return;
    }

    const interval = setInterval(() => {
      const nextSlide = (currentSlide + 1) % 5;
      carouselApi.scrollTo(nextSlide);
    }, 4000);

    return () => clearInterval(interval);
  }, [carouselApi, currentSlide, isAutoPlaying]);

  // Pause auto-play on user interaction
  const handleCarouselInteraction = () => {
    setIsAutoPlaying(false);
    setTimeout(() => {
      setIsAutoPlaying(true);
    }, 10000);
  };

  // Register interaction callback with carousel
  useEffect(() => {
    setCarouselUserInteractionCallback(() => {
      setIsAutoPlaying(false);
      setTimeout(() => {
        setIsAutoPlaying(true);
      }, 10000);
    });
  }, []);

  // Projects carousel slide tracking
  useEffect(() => {
    if (!projectsCarouselApi) {
      return;
    }

    setCurrentProjectSlide(projectsCarouselApi.selectedScrollSnap());

    projectsCarouselApi.on("select", () => {
      setCurrentProjectSlide(projectsCarouselApi.selectedScrollSnap());
    });
  }, [projectsCarouselApi]);

  // Auto-play projects carousel
  useEffect(() => {
    if (!projectsCarouselApi || !isProjectsAutoPlaying || repos.length === 0) {
      return;
    }

    const interval = setInterval(() => {
      const nextSlide = (currentProjectSlide + 1) % repos.length;
      projectsCarouselApi.scrollTo(nextSlide);
      // Reset selection when carousel auto-scrolls
      setSelectedProjectIndex(null);
    }, 6000); // Change slide every 6 seconds (slower for smoother animation)

    return () => clearInterval(interval);
  }, [projectsCarouselApi, currentProjectSlide, isProjectsAutoPlaying, repos.length]);


  // Reset selection when slide changes (user manually scrolls)
  useEffect(() => {
    // Only reset if selection exists and doesn't match current slide
    if (selectedProjectIndex !== null && selectedProjectIndex !== currentProjectSlide) {
      setSelectedProjectIndex(null);
    }
  }, [currentProjectSlide, selectedProjectIndex]);

  // Pause projects auto-play on user interaction
  const handleProjectsCarouselInteraction = () => {
    setIsProjectsAutoPlaying(false);
    setTimeout(() => {
      setIsProjectsAutoPlaying(true);
    }, 10000);
  };

  const generateContributionCalendar = () => {
    const days = [];
    const today = new Date();
    
    for (let i = 364; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      
      const commits = Math.floor(Math.random() * 10);
      
      days.push({
        date: date.toISOString().split('T')[0],
        count: commits,
        level: commits === 0 ? 0 : commits < 3 ? 1 : commits < 5 ? 2 : commits < 7 ? 3 : 4
      });
    }
    
    setContributions(days);
  };

  // Enhanced scroll animation detection using IntersectionObserver
  useEffect(() => {
    const observerOptions = {
      threshold: 0.05,
      rootMargin: '0px 0px -100px 0px'
    };

    const sectionKeyMap = {
      'about-me-section': 'about',
      'skills-section': 'skills',
      'projects-section': 'projects',
      'contact-section': 'contact',
      'experience-section': 'experience',
      'education-section': 'education',
      'projects-carousel-section': 'projectsCarousel'
    };

    const observerCallback = (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const sectionId = entry.target.id;
          const key = sectionKeyMap[sectionId];
          
          if (key) {
            setVisibleSections(prev => {
              // Only update if not already visible to prevent unnecessary re-renders
              if (!prev[key]) {
                return { ...prev, [key]: true };
              }
              return prev;
            });
          }
        }
      });
    };

    const observer = new IntersectionObserver(observerCallback, observerOptions);

    // Observe all sections
    const sections = Object.keys(sectionKeyMap);

    sections.forEach((id) => {
      const element = document.getElementById(id);
      if (element) {
        observer.observe(element);
      }
    });

    // Also check on initial load for elements already in view
    const checkInitialVisibility = () => {
      sections.forEach((id) => {
        const element = document.getElementById(id);
        if (element) {
          const rect = element.getBoundingClientRect();
          const isVisible = rect.top < window.innerHeight * 0.9 && rect.bottom > 0;
          if (isVisible) {
            const key = sectionKeyMap[id];
            
            if (key) {
              setVisibleSections(prev => {
                // Only update if not already visible
                if (!prev[key]) {
                  return { ...prev, [key]: true };
                }
                return prev;
              });
            }
          }
        }
      });
    };

    // Check after a short delay to ensure DOM is ready
    const timeout1 = setTimeout(checkInitialVisibility, 100);
    const timeout2 = setTimeout(checkInitialVisibility, 500);

    return () => {
      sections.forEach((id) => {
        const element = document.getElementById(id);
        if (element) {
          observer.unobserve(element);
        }
      });
      clearTimeout(timeout1);
      clearTimeout(timeout2);
    };
  }, []); // Empty dependency array - only run once on mount




  return (
    <div className="app">
      <div className="spline-wrapper">
        <Spline scene="https://prod.spline.design/u2Vg7RRtCDt4DufQ/scene.splinecode" />
      </div>
      
      <div className="name-header">
        <h1 className="name-title">Areyan Rastawan</h1>
      </div>
      <div className="button-container">
        <button className="app-button" onClick={() => scrollToSection('about-me-section')}>About Me</button>
        <button className="app-button" onClick={() => scrollToSection('projects-carousel-section')}>Projects</button>
        <button className="app-button" onClick={() => scrollToSection('experience-section')}>Experience</button>
        <button className="app-button" onClick={() => scrollToSection('skills-section')}>Skills</button>
        <button className="app-button" onClick={() => scrollToSection('education-section')}>Education</button>
        <button className="app-button" onClick={() => scrollToSection('contact-section')}>Contact</button>
      </div>
      
      {/* About Me Section */}
      <div id="about-me-section" className={`max-w-6xl mx-auto px-4 py-12 border-2 border-white rounded-lg mb-20 about-me-border-animate section-fade-in ${visibleSections.about ? 'section-visible' : ''}`}>
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-6 text-center">
            About Me
          </h1>
          <Card className="p-8 card-animate">
            <CardContent className="space-y-4">
              <p className="text-muted-foreground leading-relaxed text-base">
                I'm a Computer Science graduate from the University of Oregon with a passion for computer vision, machine learning, and game development. I enjoy building systems that mix technical problem-solving with creative design, and I focus on using modern tools to create meaningful software. I see myself as a lifelong learner, always exploring new techniques, improving my workflow, and looking for opportunities to build technology that is practical and useful.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Projects Section - Horizontal Carousel */}
      <div id="projects-carousel-section" className={`w-full px-4 py-12 mb-0 section-fade-in ${visibleSections.projectsCarousel ? 'section-visible' : ''}`} style={{ overflow: 'visible' }}>
        <TooltipProvider>
          <div className="w-full" style={{ overflow: 'visible' }}>
            <div className="flex items-center justify-center gap-4 mb-2" style={{ position: 'relative', zIndex: 10, marginTop: '0.5rem' }}>
              <h2 className="text-4xl font-bold text-center text-foreground">
                Projects
              </h2>
              {isLoading && (
                <p className="text-muted-foreground text-center">Loading projects...</p>
              )}
              {!isLoading && repos.length === 0 && (
                <p className="text-muted-foreground text-center">No projects to display</p>
              )}
            </div>
            
            <div style={{ minHeight: '450px', position: 'relative' }}>
              <Carousel
                setApi={setProjectsCarouselApi}
                opts={{
                  align: "center",
                  loop: true,
                  dragFree: true,
                  containScroll: "trimSnaps",
                }}
                className="w-full"
                style={{ overflow: 'visible' }}
                onMouseDown={handleProjectsCarouselInteraction}
                onTouchStart={handleProjectsCarouselInteraction}
              >
                <CarouselContent className="-ml-2 md:-ml-4" style={{ paddingTop: '4rem', overflow: 'visible', alignItems: 'flex-end' }}>
                {repos.length > 0 ? repos.map((repo, index) => {
                  const isCenter = currentProjectSlide === index;
                  return (
                    <CarouselItem
                      key={repo.id}
                      className={`pl-2 md:pl-4 flex items-end ${
                        isCenter 
                          ? 'basis-full sm:basis-2/3 md:basis-1/2 lg:basis-2/5 xl:basis-1/3' 
                          : 'basis-full sm:basis-1/2 md:basis-1/3 lg:basis-1/4 xl:basis-1/5 2xl:basis-1/6'
                      }`}
                    >
                      <Card 
                        className={`repo-card cursor-pointer ${
                          isCenter 
                            ? 'p-6 shadow-xl border-primary min-h-[350px] repo-card-center' 
                            : 'p-3 hover:opacity-90 min-h-[200px] max-h-[220px] opacity-70 repo-card-side'
                        } ${selectedProjectIndex === index ? 'ring-2 ring-primary ring-offset-2' : ''}`}
                        style={{
                          animationDelay: `${index * 0.05}s`,
                          animationFillMode: 'forwards',
                        }}
                        onClick={(e) => {
                          e.preventDefault();
                          // First, scroll to this card to make it center
                          if (projectsCarouselApi && currentProjectSlide !== index) {
                            projectsCarouselApi.scrollTo(index);
                            setSelectedProjectIndex(index);
                          } else if (selectedProjectIndex === index) {
                            // Second click on already selected card - open the link
                            window.open(repo.html_url, '_blank', 'noopener,noreferrer');
                            setSelectedProjectIndex(null);
                          } else {
                            // First click - select the card
                            setSelectedProjectIndex(index);
                          }
                        }}
                      >
                        <div className="flex flex-col h-full w-full">
                          <h4 className={`font-bold hover:text-primary transition-colors mb-3 ${
                            isCenter ? 'text-xl' : 'text-sm'
                          }`}>
                            {repo.name}
                          </h4>
                          <div className={`flex-1 ${isCenter ? 'overflow-y-auto' : 'overflow-hidden'} mb-4`}>
                            {isCenter ? (
                              <p className="text-base text-muted-foreground leading-relaxed whitespace-normal break-words">
                                {repo.description || 'No description'}
                              </p>
                            ) : (
                              <p className="text-xs text-muted-foreground line-clamp-2">
                                {repo.description ? (repo.description.length > 50 ? repo.description.substring(0, 50) + '...' : repo.description) : 'No description'}
                              </p>
                            )}
                          </div>
                          <div className={`flex gap-2 text-muted-foreground flex-wrap mt-auto ${
                            isCenter ? 'text-sm' : 'text-[10px]'
                          }`}>
                            {repo.language && (
                              <Badge variant="outline" className={isCenter ? 'text-sm px-2 py-1' : 'text-[10px] px-1.5 py-0'}>
                                {repo.language}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </Card>
                    </CarouselItem>
                  );
                }) : (
                  <div className="w-full text-center py-8 text-muted-foreground">
                    {isLoading ? 'Loading projects...' : 'No projects available'}
                  </div>
                )}
              </CarouselContent>
              <CarouselPrevious className="hidden md:flex -left-12" />
              <CarouselNext className="hidden md:flex -right-12" />
            </Carousel>
            </div>
            
            {/* Projects Dots Slider */}
            {repos.length > 0 && (
              <div className="flex flex-col items-center gap-4 mt-6">
                <div 
                  className="projects-dots-container flex justify-center gap-2 cursor-grab active:cursor-grabbing select-none py-2 px-4 -mx-4"
                  onMouseDown={handleProjectsDotsMouseDown}
                  onTouchStart={handleProjectsDotsMouseDown}
                  onTouchMove={handleProjectsDotsMouseMove}
                  onTouchEnd={handleProjectsDotsMouseUp}
                >
                  {repos.map((repo, index) => (
                    <Tooltip key={repo.id}>
                      <TooltipTrigger asChild>
                        <button
                          onClick={(e) => {
                            if (!isDraggingProjectsDots) {
                              handleProjectsCarouselInteraction();
                              projectsCarouselApi?.scrollTo(index);
                            }
                          }}
                          className={`h-2 rounded-full transition-all duration-500 ease-out ${
                            currentProjectSlide === index
                              ? 'w-8 bg-foreground'
                              : 'w-2 bg-muted-foreground hover:bg-foreground/50'
                          }`}
                          aria-label={`Go to ${repo.name}`}
                        />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{repo.name}</p>
                      </TooltipContent>
                    </Tooltip>
                  ))}
                </div>
              </div>
            )}
          </div>
        </TooltipProvider>
      </div>

      {/* GitHub Statistics Section */}
      <div id="projects-section" className={`max-w-7xl mx-auto px-4 pt-0 mb-20 section-fade-in ${visibleSections.projects ? 'section-visible' : ''}`} style={{ background: '#000000' }}>
        <div style={{ background: '#000000', width: '100%' }}>
          <div className="border border-foreground/20 rounded-lg p-6 pb-12" style={{ background: '#000000' }}>
            {/* Stats Hub Header */}
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-foreground/10">
              <div>
                <h3 className="text-2xl font-bold text-foreground">Project Statistics</h3>
              </div>
            </div>
            
            {/* Main Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* Languages Chart */}
              <div className="flex flex-col">
                <div className="mb-3">
                  <h3 className="text-lg font-bold text-foreground mb-1">Most Used Languages</h3>
                  <p className="text-muted-foreground text-xs">Language usage distribution</p>
                </div>
                <div className="flex-1 flex items-center justify-center overflow-hidden min-h-[280px]">
                  {isLoading ? (
                    <div className="flex items-center justify-center h-full w-full text-muted-foreground">
                      Loading chart data...
                    </div>
                  ) : apiError ? (
                    <div className="flex items-center justify-center h-full w-full text-destructive">
                      Error: {apiError}
                    </div>
                  ) : chartData.length > 0 ? (
                    <div className="w-full h-full flex items-center justify-center overflow-hidden">
                      <ChartContainer
                        config={{
                          usage: {
                            label: "Usage",
                            color: "var(--chart-1)",
                          },
                        }}
                        className="w-full h-full max-w-[280px] max-h-[280px] md:max-w-[320px] md:max-h-[320px] aspect-square"
                      >
                        <RadarChart data={chartData} width={320} height={320}>
                          <ChartTooltip 
                            cursor={false} 
                            content={({ active, payload }) => {
                              if (!active || !payload || !payload[0]) return null;
                              const data = payload[0].payload;
                              return (
                                <div className="rounded-lg border border-border/50 bg-background px-3 py-2 text-xs shadow-md">
                                  <div className="font-bold text-foreground mb-1">{data.language}</div>
                                  <div className="text-muted-foreground">
                                    Usage: <span className="font-bold text-foreground">{data.truePercentage?.toFixed(1)}%</span>
                                  </div>
                                </div>
                              );
                            }} 
                          />
                          <PolarAngleAxis 
                            dataKey="language" 
                            tick={{ fill: 'var(--foreground)', fontSize: 16 }}
                          />
                          <PolarGrid stroke="var(--border)" />
                          <Radar
                            dataKey="usage"
                            fill="var(--chart-1)"
                            fillOpacity={0.8}
                            stroke="var(--foreground)"
                            strokeWidth={3}
                            dot={{
                              r: 5,
                              fill: "var(--foreground)",
                              fillOpacity: 1,
                              strokeWidth: 2,
                              stroke: "var(--background)",
                            }}
                          />
                        </RadarChart>
                      </ChartContainer>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full w-full text-muted-foreground">
                      No chart data available
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs pt-3 mt-3 border-t border-foreground/10">
                  <span className="font-bold text-foreground">Top {chartData.length} Languages</span>
                  <TrendingUp className="h-3 w-3" />
                </div>
              </div>
              
              {/* Contribution Calendar */}
              <div className="flex flex-col">
                <div className="mb-3">
                  <h3 className="text-lg font-bold text-foreground mb-1">Contribution Activity</h3>
                </div>
                <div className="flex-1 overflow-hidden flex items-center justify-center w-full min-h-[280px]">
                  <div className="calendar-grid w-full max-w-full">
                    {contributions.map((day, index) => (
                      <div
                        key={index}
                        className={`contribution-day level-${day.level}`}
                        title={`${day.date}: ${day.count} commits`}
                        style={{
                          animationDelay: `${index * 0.01}s`,
                          animationFillMode: 'forwards'
                        }}
                      />
                    ))}
                  </div>
                </div>
                <div className="calendar-legend mt-3 pt-3 border-t border-foreground/10">
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-xs text-muted-foreground">Less</span>
                    <div className="legend-squares">
                      <div className="legend-square level-0"></div>
                      <div className="legend-square level-1"></div>
                      <div className="legend-square level-2"></div>
                      <div className="legend-square level-3"></div>
                      <div className="legend-square level-4"></div>
                    </div>
                    <span className="text-xs text-muted-foreground">More</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Experience Section */}
      <div id="experience-section" className={`max-w-6xl mx-auto px-4 py-12 border-2 border-white rounded-lg mb-20 mt-32 about-me-border-animate section-fade-in ${visibleSections.experience ? 'section-visible' : ''}`}>
        <div>
          <h2 className={`text-4xl font-bold text-center mb-12 text-foreground ${visibleSections.experience ? 'section-title-visible' : 'section-title-hidden'}`}>
            Experience
          </h2>
          
          <Accordion type="single" collapsible className="w-full" defaultValue="">
            <AccordionItem value="experience" className="border-2 rounded-lg border-b-2">
              <Card className="border-0 card-animate">
                <AccordionTrigger className="px-6 py-4 hover:no-underline [&[data-state=open]>svg]:rotate-180 items-start [&>svg]:mt-1">
                  <CardHeader className="w-full p-0">
                    <div className="flex items-start justify-between gap-4 w-full">
                      <div className="flex-1 text-left">
                        <CardTitle className="text-2xl font-bold text-foreground mb-2">
                          Research Software Engineer
                        </CardTitle>
                        <CardDescription className="text-muted-foreground">
                          Action Control Lab | Eugene, OR
                        </CardDescription>
                      </div>
                      <Badge variant="secondary" className="text-sm whitespace-nowrap">
                        November 2024 - June 2025
                      </Badge>
                    </div>
                  </CardHeader>
                </AccordionTrigger>
                <AccordionContent>
                  <CardContent className="space-y-8 pt-6">
              <ul className="space-y-4">
                {[
                  "Developed a [hardware-integrated 2D simulation in PsychoPy] that combined task coordination, input capture, and visual feedback for [motor-learning neurological studies].",
                  "Engineered the [sensor-to-software pipeline in Python], processing pressure-pad signals from the <PSURP_LINK>PSURP</PSURP_LINK> into [millisecond-accurate controller inputs] for research analysis.",
                  "Built a [fully automated data-capture workflow] that captured trial events, recorded performance metrics, and [exported structured CSV datasets] with no manual processing required.",
                  "Designed a [participant configuration GUI] that streamlined setup, maintained consistent trial settings, and [reduced researcher effort across sessions].",
                  "Collaborated with neuroscience researchers through [iterative prototyping] to refine task mechanics and experiment parameters as study requirements evolved.",
                  "Authored [technical documentation] covering setup, calibration, integration, and long-term maintenance workflows."
                ].map((item, index) => {
                  // Parse text and make bracketed parts bold, handle PSURP link
                  let processedItem = item;
                  // Replace PSURP link placeholder with actual link
                  processedItem = processedItem.replace(
                    /<PSURP_LINK>(.*?)<\/PSURP_LINK>/g,
                    '<a href="https://www.blackboxtoolkit.com/psurp.html" target="_blank" rel="noopener noreferrer" className="text-primary underline">$1</a>'
                  );
                  
                  const parts = processedItem.split(/(\[.*?\]|<a href.*?<\/a>)/g);
                  return (
                    <li key={index} className="flex gap-3 items-start">
                      <span className="text-muted-foreground mt-1">◆</span>
                      <div className="flex-1">
                        <span className="text-muted-foreground">
                          {parts.map((part, i) => {
                            if (part.startsWith('[') && part.endsWith(']')) {
                              return <strong key={i} className="text-foreground">{part.slice(1, -1)}</strong>;
                            } else if (part.startsWith('<a href')) {
                              // Handle the link
                              return <span key={i} dangerouslySetInnerHTML={{ __html: part.replace(/className=/g, 'class=') }} />;
                            } else if (part) {
                              return <span key={i}>{part}</span>;
                            }
                            return null;
                          })}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
              
              <Separator className="my-6" />
              
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <CheckCircle2 className="w-5 h-5 text-primary" />
                  <h3 className="text-xl font-bold text-foreground">
                    Impact
                  </h3>
                </div>
                <ul className="space-y-4">
                  {[
                    "[Increased participant engagement] through interactive task elements and visual feedback.",
                    "[Reduced researcher workload by ~80 percent] by automating setup and trial preparation.",
                    "[Improved measurement accuracy] using a calibrated pressure-pad pipeline for higher-resolution force input.",
                    "[Improved data reliability] across 15+ sessions through standardized timing and automated dataset generation.",
                    "[Expanded study capacity] by streamlining workflows and reducing manual effort to support more participants."
                  ].map((item, index) => {
                    // Parse text and make bracketed parts bold
                    const parts = item.split(/(\[.*?\])/g);
                    return (
                      <li key={index} className="flex gap-3 items-start">
                        <span className="text-muted-foreground mt-1">◆</span>
                        <div className="flex-1">
                          <span className="text-muted-foreground">
                            {parts.map((part, i) => {
                              if (part.startsWith('[') && part.endsWith(']')) {
                                return <strong key={i} className="text-foreground">{part.slice(1, -1)}</strong>;
                              } else if (part) {
                                return <span key={i}>{part}</span>;
                              }
                              return null;
                            })}
                          </span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
                  </CardContent>
                </AccordionContent>
              </Card>
            </AccordionItem>
          </Accordion>
        </div>
      </div>
      
      {/* Skills Section */}
      <div id="skills-section" className={`max-w-6xl mx-auto px-4 py-12 border-2 border-white rounded-lg mb-20 about-me-border-animate section-fade-in ${visibleSections.skills ? 'section-visible' : ''}`}>
        <TooltipProvider>
          <div>
            <div className="flex items-center justify-center gap-4 mb-8">
              <h2 className="text-4xl font-bold text-center text-foreground">
                Skills
              </h2>
            </div>
            
            <Carousel
              setApi={setCarouselApi}
              opts={{
                align: "start",
                loop: true,
                dragFree: true,
                containScroll: "trimSnaps",
              }}
              className="w-full"
            >
              <CarouselContent className="-ml-2 md:-ml-4">
                {/* Programming Languages */}
                <CarouselItem className="pl-2 md:pl-4 md:basis-1/2 lg:basis-1/3">
                  <Card className="p-6 hover:shadow-xl transition-all duration-300 hover:scale-105 skill-card">
                    <CardHeader>
                      <CardTitle className="text-2xl font-bold text-foreground mb-4">
                        Programming Languages
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-3 gap-4">
                        {[
                          { name: 'Python', img: 'python.png' },
                          { name: 'C', img: 'c.png' },
                          { name: 'C++', img: 'cplusplus.png' },
                          { name: 'C#', img: 'csharpe.png' },
                          { name: 'JavaScript', img: 'js.png' },
                          { name: 'HTML', img: 'html.png' },
                          { name: 'CSS', img: 'css.png' },
                        ].map((skill, index) => (
                          <div 
                            key={skill.name}
                            className="flex flex-col items-center gap-2 skill-icon"
                            style={{
                              animationDelay: `${index * 0.1}s`
                            }}
                          >
                            <img 
                              src={`${process.env.PUBLIC_URL}/${skill.img}`} 
                              alt={`${skill.name} Logo`}
                              className="w-12 h-12 object-contain hover:scale-110 transition-transform duration-300"
                            />
                            <span className="text-xs text-muted-foreground text-center">{skill.name}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </CarouselItem>

                {/* Web Development */}
                <CarouselItem className="pl-2 md:pl-4 md:basis-1/2 lg:basis-1/3">
                  <Card className="p-6 hover:shadow-xl transition-all duration-300 hover:scale-105 skill-card">
                    <CardHeader>
                      <CardTitle className="text-2xl font-bold text-foreground mb-4">
                        Web Development
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-3 gap-4">
                        {[
                          { name: 'React', img: 'react.png', hasImage: true },
                          { name: 'Node.js', img: 'nodejs.png', hasImage: true },
                          { name: 'SQL', img: 'sql.png', hasImage: true },
                          { name: 'Spline', img: 'spline.png', hasImage: true },
                          { name: 'REST API Design', img: 'rest-api.png', hasImage: true },
                          { name: 'FastAPI', img: 'fastapi.png', hasImage: true },
                          { name: 'Flask', img: 'flask.png', hasImage: true },
                          { name: 'Firebase', img: 'firebase.png', hasImage: true },
                        ].map((skill, index) => (
                          <div 
                            key={skill.name}
                            className="flex flex-col items-center gap-2 skill-icon"
                            style={{
                              animationDelay: `${index * 0.1}s`
                            }}
                          >
                            {skill.hasImage ? (
                              <img 
                                src={`${process.env.PUBLIC_URL}/${skill.img}`} 
                                alt={`${skill.name} Logo`}
                                className="w-16 h-16 object-contain hover:scale-110 transition-transform duration-300"
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                  e.target.nextSibling.style.display = 'flex';
                                }}
                              />
                            ) : null}
                            <div 
                              className={`w-16 h-16 bg-muted rounded-lg flex items-center justify-center text-xs font-semibold text-foreground border-2 border-border hover:scale-110 transition-transform duration-300 ${skill.hasImage ? 'hidden' : 'flex'}`}
                            >
                              {skill.name.split(' ').map(w => w[0]).join('').substring(0, 3)}
                            </div>
                            <span className="text-sm text-muted-foreground text-center">{skill.name}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </CarouselItem>

                {/* Machine Learning & AI */}
                <CarouselItem className="pl-2 md:pl-4 md:basis-1/2 lg:basis-1/3">
                  <Card className="p-6 hover:shadow-xl transition-all duration-300 hover:scale-105 skill-card">
                    <CardHeader>
                      <CardTitle className="text-2xl font-bold text-foreground mb-4">
                        Machine Learning & AI
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-3 gap-4">
                        {[
                          { name: 'TensorFlow', img: 'tflow.png', hasImage: true },
                          { name: 'PyTorch', img: 'ptorch.png', hasImage: true },
                          { name: 'Unity ML Agents', img: 'mlagentslogo.png', hasImage: true },
                          { name: 'NumPy', img: 'numpy.png', hasImage: true },
                          { name: 'Matplotlib', img: 'matplotlib.png', hasImage: true },
                          { name: 'Pandas', img: 'pandas.png', hasImage: true },
                          { name: 'Scikit-learn', img: 'scikit-learn.png', hasImage: true },
                          { name: 'OpenCV', img: 'opencv.png', hasImage: true },
                        ].map((skill, index) => (
                          <div 
                            key={skill.name}
                            className="flex flex-col items-center gap-2 skill-icon"
                            style={{
                              animationDelay: `${index * 0.1}s`
                            }}
                          >
                            {skill.hasImage ? (
                              <img 
                                src={`${process.env.PUBLIC_URL}/${skill.img}`} 
                                alt={`${skill.name} Logo`}
                                className="w-16 h-16 object-contain hover:scale-110 transition-transform duration-300"
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                  e.target.nextSibling.style.display = 'flex';
                                }}
                              />
                            ) : null}
                            <div 
                              className={`w-16 h-16 bg-muted rounded-lg flex items-center justify-center text-xs font-semibold text-foreground border-2 border-border hover:scale-110 transition-transform duration-300 ${skill.hasImage ? 'hidden' : 'flex'}`}
                            >
                              {skill.name.split(' ').map(w => w[0]).join('').substring(0, 3)}
                            </div>
                            <span className="text-sm text-muted-foreground text-center">{skill.name}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </CarouselItem>

                {/* Game Development & Simulation */}
                <CarouselItem className="pl-2 md:pl-4 md:basis-1/2 lg:basis-1/3">
                  <Card className="p-6 hover:shadow-xl transition-all duration-300 hover:scale-105 skill-card">
                    <CardHeader>
                      <CardTitle className="text-2xl font-bold text-foreground mb-4">
                        Game Development & Simulation
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-3 gap-4">
                        {[
                          { name: 'Unity', img: 'unity.png' },
                          { name: 'Unreal Engine', img: 'ue.png' },
                          { name: 'PsychoPy', img: 'psychopy.png' },
                        ].map((skill, index) => (
                          <div 
                            key={skill.name}
                            className="flex flex-col items-center gap-2 skill-icon"
                            style={{
                              animationDelay: `${index * 0.1}s`
                            }}
                          >
                            <img 
                              src={`${process.env.PUBLIC_URL}/${skill.img}`} 
                              alt={`${skill.name} Logo`}
                              className="w-16 h-16 object-contain hover:scale-110 transition-transform duration-300"
                            />
                            <span className="text-xs text-muted-foreground text-center">{skill.name}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </CarouselItem>

                {/* Tools & Software */}
                <CarouselItem className="pl-2 md:pl-4 md:basis-1/2 lg:basis-1/3">
                  <Card className="p-6 hover:shadow-xl transition-all duration-300 hover:scale-105 skill-card">
                    <CardHeader>
                      <CardTitle className="text-2xl font-bold text-foreground mb-4">
                        Tools & Software
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-3 gap-4">
                        {[
                          { name: 'Git', img: 'git.png', hasImage: true },
                          { name: 'VS Code', img: 'vscode.png', hasImage: true },
                          { name: 'Pycharm', img: 'pycharm.png', hasImage: true },
                          { name: 'Powershell', img: 'powershell.png', hasImage: true },
                          { name: 'Linux', img: 'linux.png', hasImage: true },
                          { name: 'MATLAB', img: 'matlab.png', hasImage: true },
                          { name: 'Terminal', img: 'terminal.png', hasImage: true },
                          { name: 'Excel', img: 'excel.png', hasImage: true },
                          { name: 'Photoshop', img: 'photoshop.png', hasImage: true },
                          { name: 'Jupyter', img: 'jupyter.png', hasImage: true },
                        ].map((skill, index) => (
                          <div 
                            key={skill.name}
                            className="flex flex-col items-center gap-2 skill-icon"
                            style={{
                              animationDelay: `${index * 0.05}s`
                            }}
                          >
                            {skill.hasImage ? (
                              <img 
                                src={`${process.env.PUBLIC_URL}/${skill.img}`} 
                                alt={`${skill.name} Logo`}
                                className="w-12 h-12 object-contain hover:scale-110 transition-transform duration-300"
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                  e.target.nextSibling.style.display = 'flex';
                                }}
                              />
                            ) : null}
                            <div 
                              className={`w-12 h-12 bg-muted rounded-lg flex items-center justify-center text-xs font-semibold text-foreground border-2 border-border hover:scale-110 transition-transform duration-300 ${skill.hasImage ? 'hidden' : 'flex'}`}
                            >
                              {skill.name.split(' ').map(w => w[0]).join('').substring(0, 3)}
                            </div>
                            <span className="text-xs text-muted-foreground text-center">{skill.name}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </CarouselItem>
              </CarouselContent>
            </Carousel>
            
            {/* Carousel Indicators */}
            <div className="flex flex-col items-center gap-4 mt-6">
              <div 
                className="dots-container flex justify-center gap-2 cursor-grab active:cursor-grabbing select-none py-2 px-4 -mx-4"
                onMouseDown={handleDotsMouseDown}
                onTouchStart={handleDotsMouseDown}
                onTouchMove={handleDotsMouseMove}
                onTouchEnd={handleDotsMouseUp}
              >
                {[
                  { index: 0, label: 'Languages' },
                  { index: 1, label: 'Web Dev' },
                  { index: 2, label: 'ML/AI' },
                  { index: 3, label: 'Game Dev' },
                  { index: 4, label: 'Tools' },
                ].map(({ index, label }) => (
                  <Tooltip key={index}>
                    <TooltipTrigger asChild>
                      <button
                        onClick={(e) => {
                          if (!isDraggingDots) {
                            handleCarouselInteraction();
                            carouselApi?.scrollTo(index);
                          }
                        }}
                        className={`h-2 rounded-full transition-all duration-500 ease-out ${
                          currentSlide === index
                            ? 'w-8 bg-foreground'
                            : 'w-2 bg-muted-foreground hover:bg-foreground/50'
                        }`}
                        aria-label={`Go to ${label}`}
                      />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{label}</p>
                    </TooltipContent>
                  </Tooltip>
                ))}
              </div>
            </div>
          </div>
        </TooltipProvider>
      </div>

      {/* Education Section */}
      <div id="education-section" className={`max-w-6xl mx-auto px-4 py-12 border-2 border-white rounded-lg mb-20 about-me-border-animate section-fade-in ${visibleSections.education ? 'section-visible' : ''}`}>
        <div>
          <h2 className="text-4xl font-bold text-center mb-12 text-foreground">
            Education
          </h2>
          
          {/* Mobile: Stacked layout */}
          <div className="flex flex-col gap-4 md:hidden">
            {/* High School */}
            <Card className="border-2 education-card-enter card-animate">
              <CardHeader className="p-6">
                <div className="flex items-center justify-between gap-4">
                  <CardTitle className="text-lg font-bold text-foreground">
                    Sunny Hills High School
                  </CardTitle>
                  <Badge variant="secondary" className="text-sm">
                    2017 - 2021
                  </Badge>
                </div>
              </CardHeader>
            </Card>
            
            {/* University */}
            <Card className="border-2 education-card-enter card-animate">
              <CardHeader className="p-6">
                <div className="flex items-center justify-between gap-4">
                  <CardTitle className="text-lg font-bold text-foreground">
                    University of Oregon
                  </CardTitle>
                  <Badge variant="secondary" className="text-sm">
                    2021 - 2025
                  </Badge>
                </div>
                <CardDescription className="text-sm text-muted-foreground mt-2">
                  Bachelor of Science in Computer Science
                </CardDescription>
              </CardHeader>
            </Card>
          </div>

          {/* Desktop: Carousel layout */}
          <div className="hidden md:block">
            <Carousel
              setApi={setEducationCarouselApi}
              opts={{
                align: "start",
                loop: true,
                dragFree: true,
                containScroll: "trimSnaps",
              }}
              className="w-full"
            >
              <CarouselContent className="-ml-2 md:-ml-4">
                {/* High School */}
                <CarouselItem className="pl-2 md:pl-4 md:basis-1/2">
                  <Card className="border-2 education-card-enter card-animate">
                    <CardHeader className="p-6">
                      <div className="flex items-center justify-between gap-4">
                        <CardTitle className="text-lg font-bold text-foreground">
                          Sunny Hills High School
                        </CardTitle>
                        <Badge variant="secondary" className="text-sm">
                          2017 - 2021
                        </Badge>
                      </div>
                    </CardHeader>
                  </Card>
                </CarouselItem>
                
                {/* University */}
                <CarouselItem className="pl-2 md:pl-4 md:basis-1/2">
                  <Card className="border-2 education-card-enter card-animate">
                    <CardHeader className="p-6">
                      <div className="flex items-center justify-between gap-4">
                        <CardTitle className="text-lg font-bold text-foreground">
                          University of Oregon
                        </CardTitle>
                        <Badge variant="secondary" className="text-sm">
                          2021 - 2025
                        </Badge>
                      </div>
                      <CardDescription className="text-sm text-muted-foreground mt-2">
                        Bachelor of Science in Computer Science
                      </CardDescription>
                    </CardHeader>
                  </Card>
                </CarouselItem>
              </CarouselContent>
            </Carousel>
          </div>
        </div>
      </div>
      
      {/* Contact Section */}
      <div id="contact-section" className={`max-w-6xl mx-auto px-4 py-12 w-full border-2 border-white rounded-lg about-me-border-animate section-fade-in ${visibleSections.contact ? 'section-visible' : ''}`} style={{ marginBottom: '40px' }}>
        <div>
          <h2 className="text-4xl font-bold text-center mb-12 text-foreground">
          Contact
        </h2>
        
        <div className="w-full flex justify-center items-center gap-8">
          <a 
            href="https://github.com/AreyanR" 
            target="_blank" 
            rel="noopener noreferrer"
            className="w-20 h-20 rounded-full border-2 border-foreground/20 hover:border-foreground hover:scale-110 transition-all duration-300 flex items-center justify-center bg-transparent hover:bg-foreground/5"
          >
            <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
          </a>
          
          <a 
            href="https://www.linkedin.com/in/areyan-rastawan-bb757a259" 
            target="_blank" 
            rel="noopener noreferrer"
            className="w-20 h-20 rounded-full border-2 border-foreground/20 hover:border-foreground hover:scale-110 transition-all duration-300 flex items-center justify-center bg-transparent hover:bg-foreground/5"
          >
            <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
            </svg>
          </a>
        </div>
        </div>
      </div>
    </div>
  );
}
