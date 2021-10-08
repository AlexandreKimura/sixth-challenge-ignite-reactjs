/* eslint-disable no-param-reassign */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { GetStaticPaths, GetStaticProps } from 'next';
import Prismic from '@prismicio/client';
import { format } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';
import { FiCalendar, FiClock, FiUser } from 'react-icons/fi';
import { useRouter } from 'next/router';
import { getPrismicClient } from '../../services/prismic';

import commonStyles from '../../styles/common.module.scss';
import styles from './post.module.scss';

interface Post {
  first_publication_date: string | null;
  last_publication_date: string | null;
  data: {
    title: string;
    banner: {
      url: string;
    };
    author: string;
    content: {
      heading: string;
      body: {
        text: string;
      }[];
    }[];
  };
}

interface contentProps {
  content: {
    heading: string;
    body: {
      text: string;
    }[];
  }[];
}

interface PreviewNextPost {
  uid: string;
  data: {
    title: string;
  };
}

interface PostProps {
  post: Post;
  previousPost: PreviewNextPost[];
  nextPost: PreviewNextPost[];
  preview: boolean;
}

export default function Post({
  post,
  previousPost,
  nextPost,
  preview,
}: PostProps) {
  function dateFormatter(postDate: string): string {
    const date = format(new Date(postDate), 'dd MMM yyyy', {
      locale: ptBR,
    });

    return date;
  }

  function hourFormatter(postDate: string): string {
    const date = format(new Date(postDate), `H:m`, {
      locale: ptBR,
    });

    return date;
  }

  function averageRead({ content }: contentProps) {
    const wordPerMinute = 200;

    const words = content.reduce((acc, contentData) => {
      acc += contentData.heading.split(' ').length;

      const wordsBody = contentData.body.reduce((accBody, bodyData) => {
        accBody += bodyData.text.split(' ').length;

        return accBody;
      }, 0);

      return acc + wordsBody;
    }, 0);

    return Math.ceil(words / wordPerMinute);
  }

  const router = useRouter();
  if (router.isFallback) {
    return <h1>Carregando...</h1>;
  }

  return (
    <>
      <main className={styles.postPage}>
        <img
          className={styles.banner}
          src={post.data.banner.url}
          alt="Banner"
        />
        <div className={commonStyles.homeContainer}>
          <h1>{post.data.title}</h1>
          <div className={styles.info}>
            <time>
              <FiCalendar />
              {dateFormatter(post.first_publication_date)}
            </time>
            <p>
              <FiUser />
              {post.data.author}
            </p>
            <time>
              <FiClock />
              {`${averageRead(post.data)} min`}
            </time>
          </div>
          <p className={styles.lastEdit}>{`* editado em ${dateFormatter(
            post.last_publication_date
          )}, às ${hourFormatter(post.last_publication_date)}`}</p>
          {post.data.content.map(content => (
            <section key={content.heading}>
              <h2>{content.heading}</h2>
              {content.body.map(body => (
                <p key={`text-${body.text.length}`}>{body.text}</p>
              ))}
            </section>
          ))}
        </div>
      </main>
    </>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  const prismic = getPrismicClient();
  const posts = await prismic.query(
    [Prismic.predicates.at('document.type', 'repeatable')],
    {
      fetch: ['repeatable.uid'],
      pageSize: 1,
    }
  );

  const paths = posts.results.map(post => {
    return {
      params: {
        slug: post.uid,
      },
    };
  });

  return {
    paths,
    fallback: true,
  };
};

export const getStaticProps: GetStaticProps = async ({
  params,
  preview = false,
  previewData,
}) => {
  const prismic = getPrismicClient();
  const { slug } = params;
  const response = await prismic.getByUID('repeatable', String(slug), {
    ref: previewData?.ref || null,
  });

  const previousPost = await prismic.query(
    [Prismic.Predicates.at('document.type', 'repeatable')],
    {
      pageSize: 1,
      after: response.id,
    }
  );

  const nextPost = await prismic.query(
    [Prismic.Predicates.at('document.type', 'repeatable')],
    {
      pageSize: 1,
      after: response.id,
    }
  );

  const post = {
    uid: response.uid,
    first_publication_date: response.first_publication_date,
    last_publication_date: response.last_publication_date,
    data: {
      title: response.data.title,
      subtitle: response.data.subtitle,
      author: response.data.author,
      banner: {
        url: response.data.banner.url,
      },
      content: response.data.content.map(content => {
        return {
          heading: content.heading,
          body: [...content.body],
        };
      }),
    },
  };

  return {
    props: {
      post,
      previousPost,
      nextPost,
    },
    revalidate: 60 * 30,
  };
};
