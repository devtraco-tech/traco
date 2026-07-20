import { useEffect } from "react";

interface CourseStructuredDataProps {
  course: {
    title: string;
    description: string;
    modality: string;
    workload: number;
    investment: number;
    effective_start_date?: string | null;
    end_date?: string | null;
    vacancies: number;
    photo_1_url: string;
    language?: string | null;
  };
  teacher?: {
    name: string;
    bio?: string | null;
  } | null;
  url: string;
}

export const CourseStructuredData = ({
  course,
  teacher,
  url,
}: CourseStructuredDataProps) => {
  useEffect(() => {
    // Remove existing structured data
    const existingScript = document.querySelector('script[data-structured-data="course"]');
    if (existingScript) {
      existingScript.remove();
    }

    // Map modality to Schema.org courseMode
    const getCourseMode = (modality: string) => {
      switch (modality) {
        case "online":
          return "online";
        case "presencial":
          return "onsite";
        case "hibrido":
          return "blended";
        default:
          return "onsite";
      }
    };

    // Map language to ISO code
    const getLanguageCode = (language?: string | null) => {
      switch (language) {
        case "english":
          return "en";
        case "spanish":
          return "es";
        default:
          return "pt-BR";
      }
    };

    const structuredData = {
      "@context": "https://schema.org",
      "@type": "Course",
      name: course.title,
      description: course.description?.substring(0, 500),
      url: url,
      image: course.photo_1_url,
      inLanguage: getLanguageCode(course.language),
      numberOfCredits: course.workload,
      provider: {
        "@type": "Organization",
        name: "ABO Goiás",
        sameAs: "https://abogoias.com.br",
        url: "https://abogoias.com.br",
      },
      hasCourseInstance: {
        "@type": "CourseInstance",
        courseMode: getCourseMode(course.modality),
        courseWorkload: `PT${course.workload}H`,
        ...(course.effective_start_date && {
          startDate: course.effective_start_date,
        }),
        ...(course.end_date && {
          endDate: course.end_date,
        }),
        ...(teacher && {
          instructor: {
            "@type": "Person",
            name: teacher.name,
            ...(teacher.bio && { description: teacher.bio.substring(0, 200) }),
          },
        }),
        offers: {
          "@type": "Offer",
          price: course.investment,
          priceCurrency: "BRL",
          availability: course.vacancies > 0 
            ? "https://schema.org/InStock" 
            : "https://schema.org/SoldOut",
          validFrom: new Date().toISOString().split("T")[0],
        },
      },
      ...(teacher && {
        teaches: teacher.name,
      }),
    };

    // Create and append script
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.setAttribute("data-structured-data", "course");
    script.textContent = JSON.stringify(structuredData);
    document.head.appendChild(script);

    // Cleanup on unmount
    return () => {
      const scriptToRemove = document.querySelector('script[data-structured-data="course"]');
      if (scriptToRemove) {
        scriptToRemove.remove();
      }
    };
  }, [course, teacher, url]);

  return null;
};
