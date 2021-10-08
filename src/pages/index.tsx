/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { GetStaticProps } from 'next';

import Prismic from '@prismicio/client';
import { format } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';
import Link from 'next/link';
import { useState } from 'react';
import { FiCalendar, FiUser } from 'react-icons/fi';
import { getPrismicClient } from '../services/prismic';

import commonStyles from '../styles/common.module.scss';
import styles from './home.module.scss';

interface Post {
  uid?: string;
  first_publication_date: string | null;
  data: {
    title: string;
    subtitle: string;
    author: string;
  };
}

interface PostsPaginationProps {
  next_page: string;
  results: Post[];
}

interface HomeProps {
  postsPagination: PostsPaginationProps;
}

export default function Home({ postsPagination }: HomeProps) {
  const [posts, setPosts] = useState<Post[]>(postsPagination.results);
  const [nextPage, setNextPage] = useState<string>(postsPagination.next_page);

  function dateFormatter(postDate: string): string {
    const date = format(new Date(postDate), 'dd MMM yyyy', {
      locale: ptBR,
    });

    return date;
  }

  async function handleMorePosts(link: string): Promise<void> {
    await fetch(link)
      .then(response => response.json())
      .then(responseData => {
        const nextPostResults: Post[] = responseData.results.map(post => {
          return {
            uid: post.uid,
            first_publication_date: dateFormatter(post.first_publication_date),
            data: {
              title: post.data.title,
              subtitle: post.data.subtitle,
              author: post.data.author,
            },
          };
        });

        const nextPostLink = responseData.next_page;

        setPosts([...posts, ...nextPostResults]);
        setNextPage(nextPostLink);
      });
  }

  return (
    <>
      <main className={commonStyles.homeContainer}>
        <div>
          {posts.map(post => (
            <Link key={post.uid} href={`/post/${post.uid}`}>
              <a className={styles.post}>
                <p className={styles.title}>{post.data.title}</p>
                <p className={styles.subtitle}>{post.data.subtitle}</p>
                <div className={styles.info}>
                  <time>
                    <FiCalendar />
                    {dateFormatter(post.first_publication_date)}
                  </time>

                  <p>
                    <FiUser />
                    {post.data.author}
                  </p>
                </div>
              </a>
            </Link>
          ))}
          {nextPage && (
            <button
              className={styles.morePosts}
              type="button"
              onClick={() => handleMorePosts(nextPage)}
            >
              Carregar mais posts
            </button>
          )}
        </div>
      </main>
    </>
  );
}

export const getStaticProps: GetStaticProps = async () => {
  const prismic = getPrismicClient();

  const postsResponse = await prismic.query(
    [Prismic.predicates.at('document.type', 'repeatable')],
    {
      fetch: ['repeatable.title', 'repeatable.subtitle', 'repeatable.author'],
      pageSize: 2,
    }
  );

  const posts = postsResponse.results.map(post => {
    return {
      uid: post.uid,
      first_publication_date: post.first_publication_date,
      data: {
        title: post.data.title,
        subtitle: post.data.subtitle,
        author: post.data.author,
      },
    };
  });

  return {
    props: {
      postsPagination: {
        next_page: postsResponse.next_page,
        results: posts,
      },
    },
    revalidate: 60 * 60 * 24, // 24 hours
  };
};
